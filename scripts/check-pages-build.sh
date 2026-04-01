#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PAGES_SITE_URL="${PAGES_SITE_URL:-https://amgad01.github.io/awdah/}"
PAGES_BASE_PATH="${PAGES_BASE_PATH:-/awdah/}"

cd "$ROOT_DIR"

echo "▸ Building the frontend with the GitHub Pages base path..."
PAGES_SITE_URL="$PAGES_SITE_URL" \
PAGES_BASE_PATH="$PAGES_BASE_PATH" \
FRONTEND_DEPLOY_TARGET=pages \
VITE_AUTH_MODE="${VITE_AUTH_MODE:-local}" \
VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:3000}" \
VITE_AWS_REGION="${VITE_AWS_REGION:-eu-west-1}" \
VITE_APP_VERSION="${VITE_APP_VERSION:-local-pages-check}" \
./scripts/build-frontend.sh prod

echo ""
echo "▸ Verifying the built Pages bundle..."
./scripts/verify-pages-dist.sh "$ROOT_DIR/apps/frontend/dist" "$PAGES_SITE_URL" "$PAGES_BASE_PATH"

