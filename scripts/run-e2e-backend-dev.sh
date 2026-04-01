#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCALSTACK_HEALTHCHECK_URL="${LOCALSTACK_HEALTHCHECK_URL:-http://localhost:4566/_localstack/health}"

if ! curl -fsS "$LOCALSTACK_HEALTHCHECK_URL" >/dev/null; then
  echo "✗ LocalStack is not reachable at $LOCALSTACK_HEALTHCHECK_URL"
  echo "  Start it with: docker compose up -d localstack"
  exit 1
fi

cd "$ROOT_DIR"

exec env \
  NODE_ENV="${NODE_ENV:-test}" \
  LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}" \
  ENABLE_E2E_SEED="${ENABLE_E2E_SEED:-true}" \
  npm run dev --workspace=@awdah/backend
