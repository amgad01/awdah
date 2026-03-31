#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

load_env_defaults "$ROOT_DIR/.env"

ENV="${1:-${DEPLOY_ENV:-dev}}"
TARGET="${FRONTEND_DEPLOY_TARGET:-$(frontend_target_for_env "$ENV")}"

if [ "$TARGET" != "cloudfront" ]; then
  echo "✗ upload-frontend.sh is only valid for CloudFront environments."
  echo "  Prod now uses GitHub Pages. Run ./scripts/deploy-frontend.sh $ENV instead."
  exit 1
fi

echo "▸ Direct bucket uploads are disabled to keep deployments deterministic."
echo "▸ Reusing the canonical frontend deploy flow instead."
echo ""
"$SCRIPT_DIR/deploy-frontend.sh" "$ENV"
