#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p .hoplite/runtime .hoplite/bin

if [[ "${PREVIEW_SKIP_INSTALL:-0}" != 1 ]]; then
  npm ci --ignore-scripts --no-audit --no-fund
fi

# Preview data is isolated from any configured application database.
if [[ ! -f .hoplite/runtime/staff-preview.env ]]; then
  node <<'NODE'
const { randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const dbPassword = randomBytes(24).toString('hex');
writeFileSync('.hoplite/runtime/staff-preview.env', [
  `PREVIEW_DB_PASSWORD=${dbPassword}`,
  `TADIL_DB=postgresql://tadil_preview:${dbPassword}@localhost:5432/tadil_preview`,
  'STAFF_BOOTSTRAP_EMAIL=preview-admin@example.test',
  'STAFF_BOOTSTRAP_NAME="Preview Administrator"',
  `STAFF_BOOTSTRAP_PASSWORD=Aa1!${randomBytes(24).toString('hex')}`,
  'MINIO_ENDPOINT=localhost', 'MINIO_PORT=9002', 'MINIO_ACCESS_KEY=tadil-preview',
  `MINIO_SECRET_KEY=${randomBytes(24).toString('hex')}`,
  'MINIO_USE_SSL=false', 'MINIO_BUCKET=tadil-preview',
  'STAFF_SESSION_SECURE=false',
  'STAFF_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173',
  'TADIL_API_PROXY_TARGET=http://localhost:4444',
  'PORT=4444', 'NODE_ENV=development', '',
].join('\n'), { mode: 0o600 });
NODE
fi
set -a; source .hoplite/runtime/staff-preview.env; set +a
pg_ctlcluster 16 main start || pg_isready -q
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -v password="$PREVIEW_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE tadil_preview LOGIN PASSWORD %L', :'password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tadil_preview') \gexec
SELECT 'CREATE DATABASE tadil_preview OWNER tadil_preview'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'tadil_preview') \gexec
SQL

# Extract the official executable: sandbox Docker policy disallows volume mounts.
if [[ ! -x .hoplite/bin/minio ]]; then
  image=quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z
  docker pull "$image"
  docker save "$image" -o .hoplite/runtime/minio-image.tar
  python3 <<'PY'
import io, json, pathlib, tarfile
archive = pathlib.Path('.hoplite/runtime/minio-image.tar')
with tarfile.open(archive) as image:
    manifest = json.load(image.extractfile('manifest.json'))[0]
    for layer in manifest['Layers']:
        with tarfile.open(fileobj=io.BytesIO(image.extractfile(layer).read())) as files:
            try:
                binary = files.extractfile('usr/bin/minio')
            except KeyError:
                continue
            pathlib.Path('.hoplite/bin/minio').write_bytes(binary.read())
            break
    else:
        raise RuntimeError('Official image did not contain MinIO')
archive.unlink()
PY
  chmod 700 .hoplite/bin/minio
fi
npm run db-generate
npm run db-migrate-deploy
npm run staff:bootstrap
NX_DAEMON=false NX_PARALLEL=1 npm run build-admin-api
