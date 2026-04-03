#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCALSTACK_HEALTHCHECK_URL="${LOCALSTACK_HEALTHCHECK_URL:-http://localhost:4566/_localstack/health}"

cd "$ROOT_DIR"

if ! curl -fsS "$LOCALSTACK_HEALTHCHECK_URL" >/dev/null; then
  echo "LocalStack is not reachable at $LOCALSTACK_HEALTHCHECK_URL"
  echo "Starting it with: docker compose up -d localstack"
  docker compose up -d localstack

  for _ in $(seq 1 30); do
    if curl -fsS "$LOCALSTACK_HEALTHCHECK_URL" >/dev/null; then
      break
    fi

    sleep 2
  done

  if ! curl -fsS "$LOCALSTACK_HEALTHCHECK_URL" >/dev/null; then
    echo "✗ LocalStack is still not reachable at $LOCALSTACK_HEALTHCHECK_URL"
    exit 1
  fi
fi

exec env \
  NODE_ENV="${NODE_ENV:-test}" \
  LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}" \
  ENABLE_E2E_SEED="${ENABLE_E2E_SEED:-true}" \
  npm run dev --workspace=@awdah/backend
