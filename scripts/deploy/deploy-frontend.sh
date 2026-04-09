#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

load_env_defaults "$ROOT_DIR/.env"

if [ "${SKIP_AWS_SESSION_CHECK:-0}" != "1" ]; then
  "$SCRIPT_DIR/check-aws-session.sh" || exit 1
fi

ENV="${1:-${DEPLOY_ENV:-dev}}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
TARGET="${FRONTEND_DEPLOY_TARGET:-$(frontend_target_for_env "$ENV")}"
PAGES_ORIGIN="${PAGES_ORIGIN:-https://amgad01.github.io}"
PAGES_BASE_PATH="$(normalize_base_path "${PAGES_BASE_PATH:-/awdah/}")"
PAGES_SITE_URL="${PAGES_SITE_URL:-$(compute_site_url "$PAGES_ORIGIN" "$PAGES_BASE_PATH")}"

export AWS_DEFAULT_REGION="$AWS_REGION"

FAILED=false
trap 'status=$?; if [ "$FAILED" = true ] || [ "$status" -ne 0 ]; then echo ""; echo "✗ Frontend deploy FAILED, check the output above."; exit 1; fi' EXIT

echo "▸ [1/3] Building frontend for $TARGET..."
cd "$ROOT_DIR"
if ! SKIP_SHARED_BUILD="${SKIP_SHARED_BUILD:-0}" "$SCRIPT_DIR/build-frontend.sh" "$ENV"; then
  FAILED=true
  exit 1
fi
echo ""

case "$TARGET" in
  pages)
    echo "▸ [2/3] GitHub Pages selected; skipping FrontendStack deploy."
    echo ""

    echo "▸ [3/3] Sealing API CORS origins for GitHub Pages..."
    cd "$INFRA_DIR"
    if ! npx cdk deploy \
      "Awdah-api-stack-$ENV" \
      --context "env=$ENV" \
      --context "frontendOrigin=$PAGES_ORIGIN" \
      --require-approval never; then
      FAILED=true
      exit 1
    fi

    echo ""
    echo "✓ Frontend build is ready for GitHub Pages"
    echo "  Artifact : $ROOT_DIR/apps/frontend/dist"
    echo "  Site URL : $PAGES_SITE_URL"
    ;;
  cloudfront)
    echo "▸ [2/3] Deploying frontend stack..."
    cd "$INFRA_DIR"
    if ! npx cdk deploy \
      "Awdah-frontend-stack-$ENV" \
      --context "env=$ENV" \
      --context "deployFrontend=true" \
      --require-approval never; then
      FAILED=true
      exit 1
    fi

    echo ""
    echo "▸ [3/3] Sealing API CORS origins..."
    FRONTEND_URL="$(read_stack_output "Awdah-frontend-stack-$ENV" "FrontendUrl" "$AWS_REGION")"
    if [ -z "$FRONTEND_URL" ]; then
      FAILED=true
      echo "✗ Failed to read FrontendUrl from Awdah-frontend-stack-$ENV"
      exit 1
    fi

    if ! npx cdk deploy \
      "Awdah-api-stack-$ENV" \
      --context "env=$ENV" \
      --context "frontendOrigin=$FRONTEND_URL" \
      --require-approval never; then
      FAILED=true
      exit 1
    fi

    echo ""
    echo "✓ Frontend deployed to CloudFront"
    echo "  Frontend URL: $FRONTEND_URL"
    ;;
  *)
    FAILED=true
    echo "✗ Unsupported frontend target '$TARGET'."
    exit 1
    ;;
esac

exit 0
