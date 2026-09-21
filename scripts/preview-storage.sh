#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .hoplite/runtime/staff-preview.env; set +a
export MINIO_ROOT_USER="$MINIO_ACCESS_KEY" MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY"
if curl -fsS http://localhost:9002/minio/health/live >/dev/null 2>&1; then exit 0; fi
nohup .hoplite/bin/minio server .hoplite/runtime/minio-data --address :9002 --console-address :9003 >.hoplite/runtime/minio.log 2>&1 &
for attempt in {1..30}; do
  curl -fsS http://localhost:9002/minio/health/live >/dev/null 2>&1 && exit 0
  sleep 1
done
echo 'Preview storage did not become ready' >&2
exit 1
