#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .hoplite/runtime/staff-preview.env; set +a
export CHOKIDAR_USEPOLLING=true CHOKIDAR_INTERVAL=1000
if [[ -f .hoplite/runtime/preview-origin ]]; then
  export STAFF_PREVIEW_ORIGIN="$(cat .hoplite/runtime/preview-origin)"
  export STAFF_ALLOWED_ORIGINS="$STAFF_ALLOWED_ORIGINS,$STAFF_PREVIEW_ORIGIN"
fi
pids=()
cleanup() { for pid in "${pids[@]}"; do kill -- "-$pid" 2>/dev/null || true; done; }
trap cleanup EXIT
trap 'exit 0' INT TERM
bash scripts/preview-storage.sh
setsid node dist/apps/tadil-api/main.js &
pids+=("$!")
setsid npm run dev -w tadil-web-client -- --host 0.0.0.0 --port 5173 --strictPort &
pids+=("$!")
wait -n "${pids[@]}"
