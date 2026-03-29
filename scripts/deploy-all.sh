#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# ── AWS Session Check ──
"$SCRIPT_DIR/check-aws-session.sh" || exit 1

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

ENV="${DEPLOY_ENV:-staging}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

export AWS_DEFAULT_REGION="$AWS_REGION"

FAILED=false
trap 'if [ "$FAILED" = true ] || [ $? -ne 0 ]; then echo ""; echo "✗ Deploy FAILED — check the output above for errors."; exit 1; fi' EXIT

echo "╔══════════════════════════════════════════╗"
echo "║    Awdah — Deploy ALL (Backend + FE)     ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Environment : $ENV"
echo "║  Region      : $AWS_REGION"
echo "║  Alert Email : ${ALERT_EMAIL:-<none>}"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Bootstrap ─────────────────────────────────────────────────────────────
echo "▸ [1/8] CDK bootstrap..."
cd "$INFRA_DIR"
if ! npx cdk bootstrap --region "$AWS_REGION"; then
  FAILED=true; exit 1
fi
echo ""

# ── 2. Build shared ─────────────────────────────────────────────────────────
echo "▸ [2/8] Building shared package..."
cd "$ROOT_DIR"
if ! npm run build --workspace=packages/shared; then
  FAILED=true; exit 1
fi
echo ""

# ── 3. Build infra ──────────────────────────────────────────────────────────
echo "▸ [3/8] Building infra..."
cd "$INFRA_DIR"
if ! npm run build; then
  FAILED=true; exit 1
fi
echo ""

# ── 4. Synth ────────────────────────────────────────────────────────────────
echo "▸ [4/8] Synthesizing all stacks..."
CONTEXT_ARGS=(--context "env=$ENV" --context "deployFrontend=true")
[ -n "$ALERT_EMAIL" ] && CONTEXT_ARGS+=(--context "alertEmail=$ALERT_EMAIL")

if ! npx cdk synth --all "${CONTEXT_ARGS[@]}"; then
  FAILED=true; exit 1
fi
echo ""

# ── 5. Deploy backend stacks ───────────────────────────────────────────────
BACKEND_STACKS=(
  "Awdah-data-stack-$ENV"
  "Awdah-auth-stack-$ENV"
  "Awdah-api-stack-$ENV"
  "Awdah-backup-stack-$ENV"
  "Awdah-alarm-stack-$ENV"
)

echo "▸ [5/8] Deploying backend stacks..."
if ! npx cdk deploy \
  "${BACKEND_STACKS[@]}" \
  "${CONTEXT_ARGS[@]}" \
  --require-approval never; then
  FAILED=true; exit 1
fi
echo ""

# ── 6. Resolve Cognito outputs ──────────────────────────────────────────────
AUTH_STACK_NAME="Awdah-auth-stack-$ENV"

echo "▸ [6/8] Reading Cognito outputs from $AUTH_STACK_NAME..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text) || { FAILED=true; echo "✗ Failed to read UserPoolId"; exit 1; }

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text) || { FAILED=true; echo "✗ Failed to read UserPoolClientId"; exit 1; }

echo "  UserPoolId       = $USER_POOL_ID"
echo "  UserPoolClientId = $USER_POOL_CLIENT_ID"
echo ""

# ── 7. Build frontend ──────────────────────────────────────────────────────
echo "▸ [7/8] Building frontend..."
cd "$ROOT_DIR"
if ! VITE_API_BASE_URL="" \
  VITE_AUTH_MODE=cognito \
  VITE_COGNITO_USER_POOL_ID="$USER_POOL_ID" \
  VITE_COGNITO_CLIENT_ID="$USER_POOL_CLIENT_ID" \
  VITE_AWS_REGION="$AWS_REGION" \
  VITE_APP_VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" \
  npm run build --workspace=apps/frontend; then
  FAILED=true; exit 1
fi
echo ""

# ── 8. Deploy frontend stack ───────────────────────────────────────────────
echo "▸ [8/8] Deploying frontend stack..."
cd "$INFRA_DIR"

if ! npx cdk deploy \
  "Awdah-frontend-stack-$ENV" \
  "${CONTEXT_ARGS[@]}" \
  --require-approval never; then
  FAILED=true; exit 1
fi
echo ""

echo "╔══════════════════════════════════════════╗"
echo "║     Full deploy complete ✓               ║"
echo "║                                          ║"
echo "║  Frontend served via CloudFront S3.      ║"
echo "║  Run 'npm run deploy:stack -- data' etc  ║"
echo "║  to redeploy individual stacks.          ║"
echo "╚══════════════════════════════════════════╝"
