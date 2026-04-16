#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

load_env_defaults "$ROOT_DIR/.env"

"$SCRIPT_DIR/check-aws-session.sh" || exit 1

ENV="${1:-${DEPLOY_ENV:-dev}}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
TARGET="${FRONTEND_DEPLOY_TARGET:-$(frontend_target_for_env "$ENV")}"

export AWS_DEFAULT_REGION="$AWS_REGION"

FAILED=false
trap 'status=$?; if [ "$FAILED" = true ] || [ "$status" -ne 0 ]; then echo ""; echo "✗ Deploy FAILED, check the output above for errors."; exit 1; fi' EXIT

echo "╔══════════════════════════════════════════╗"
echo "║    Awdah: Deploy ALL (Backend + FE)     ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Environment : $ENV"
echo "║  Region      : $AWS_REGION"
echo "║  Frontend    : $TARGET"
echo "║  Alert Email : ${ALERT_EMAIL:-<none>}"
echo "╚══════════════════════════════════════════╝"
echo ""

echo "▸ [1/6] CDK bootstrap..."
cd "$INFRA_DIR"
if ! npx cdk bootstrap --region "$AWS_REGION"; then
  FAILED=true
  exit 1
fi
echo ""

echo "▸ [2/6] Building shared package..."
cd "$ROOT_DIR"
if ! npm run build --workspace=packages/shared; then
  FAILED=true
  exit 1
fi
echo ""

echo "▸ [3/6] Building infra..."
cd "$INFRA_DIR"
if ! npm run build; then
  FAILED=true
  exit 1
fi
echo ""

if [ "$TARGET" = "cloudfront" ]; then
  echo "▸ [4.5/6] Building frontend bundle for CloudFront stack deploy..."
  cd "$ROOT_DIR"
  if ! SKIP_SHARED_BUILD=1 "$SCRIPT_DIR/build-frontend.sh" "$ENV"; then
    FAILED=true
    exit 1
  fi
  echo ""
fi

echo "▸ [4/6] Synthesizing backend stacks..."
cd "$INFRA_DIR"
CONTEXT_ARGS=(--context "env=$ENV")
[ -n "$ALERT_EMAIL" ] && CONTEXT_ARGS+=(--context "alertEmail=$ALERT_EMAIL")
[ "$TARGET" = "cloudfront" ] && CONTEXT_ARGS+=(--context "deployFrontend=true")

if ! npx cdk synth --all "${CONTEXT_ARGS[@]}"; then
  FAILED=true
  exit 1
fi
echo ""

BACKEND_STACKS=(
  "Awdah-data-stack-$ENV"
  "Awdah-auth-stack-$ENV"
  "Awdah-api-stack-$ENV"
  "Awdah-backup-stack-$ENV"
  "Awdah-alarm-stack-$ENV"
)

ALL_STACKS=("${BACKEND_STACKS[@]}")
if [ "$TARGET" = "cloudfront" ]; then
  ALL_STACKS+=("Awdah-frontend-stack-$ENV")
fi

echo "▸ [5/6] Deploying stacks..."
if ! npx cdk deploy \
  "${ALL_STACKS[@]}" \
  "${CONTEXT_ARGS[@]}" \
  --outputs-file "$INFRA_DIR/outputs.json" \
  --require-approval never; then
  FAILED=true
  exit 1
fi
echo ""

echo "▸ [5.5/6] Syncing local .env with deployment outputs..."
"$SCRIPT_DIR/sync-env-from-outputs.sh"
echo ""

echo "▸ [6/6] Finalizing frontend integration..."
case "$TARGET" in
  pages)
    cd "$ROOT_DIR"
    if ! SKIP_SHARED_BUILD=1 SKIP_AWS_SESSION_CHECK=1 "$SCRIPT_DIR/deploy-frontend.sh" "$ENV"; then
      FAILED=true
      exit 1
    fi
    ;;
  cloudfront)
    cd "$INFRA_DIR"
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
    ;;
  *)
    FAILED=true
    echo "✗ Unsupported frontend target '$TARGET'."
    exit 1
    ;;
esac
echo ""

echo "╔══════════════════════════════════════════╗"
echo "║     Full deploy complete ✓               ║"
echo "║                                          ║"
if [ "$TARGET" = "pages" ]; then
  echo "║  Frontend artifact prepared for Pages.   ║"
else
  echo "║  Frontend served via CloudFront S3.      ║"
fi
echo "║  Run 'npm run deploy:stack -- data' etc  ║"
echo "║  to redeploy individual stacks.          ║"
echo "╚══════════════════════════════════════════╝"

exit 0
