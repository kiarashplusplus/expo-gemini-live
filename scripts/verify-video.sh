#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "${ROOT_DIR}/.venv" ]]; then
  echo "[verify-video] Missing .venv. Run 'python3.11 -m venv .venv && source .venv/bin/activate && pip install -e \"./server[dev]\"' first." >&2
  exit 1
fi

source "${ROOT_DIR}/.venv/bin/activate"

echo "[verify-video] Running backend tests"
pytest "${ROOT_DIR}/server/tests" -q

echo "[verify-video] Type-checking the Expo project"
pushd "${ROOT_DIR}/mobile" > /dev/null
npx tsc --noEmit
popd > /dev/null

echo ""
echo "Backend + TypeScript checks passed. To complete the verification run:"
echo "  1. source .venv/bin/activate && uvicorn server.app.main:create_app --factory --reload"
echo "  2. cd mobile && npx expo start --clear"
echo "  3. Connect with the Expo dev client and confirm local + remote video panes render"
