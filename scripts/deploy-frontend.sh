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

export AWS_DEFAULT_REGION="$AWS_REGION"

FAILED=false
trap 'if [ "$FAILED" = true ] || [ $? -ne 0 ]; then echo ""; echo "✗ Frontend deploy FAILED — check the output above."; exit 1; fi' EXIT

echo "▸ [1/4] Reading Cognito outputs..."
AUTH_STACK_NAME="Awdah-auth-stack-$ENV"

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text) || { FAILED=true; echo "✗ Failed to read UserPoolId — is $AUTH_STACK_NAME deployed?"; exit 1; }

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text) || { FAILED=true; echo "✗ Failed to read UserPoolClientId"; exit 1; }

echo "  UserPoolId       = $USER_POOL_ID"
echo "  UserPoolClientId = $USER_POOL_CLIENT_ID"
echo ""

echo "▸ [2/4] Building shared package..."
cd "$ROOT_DIR"
if ! npm run build --workspace=packages/shared; then
  FAILED=true; exit 1
fi

echo "▸ [3/4] Building frontend..."
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

echo "▸ [4/4] Deploying frontend stack..."
cd "$INFRA_DIR"
if ! npx cdk deploy \
  "Awdah-frontend-stack-$ENV" \
  --context "env=$ENV" \
  --context "deployFrontend=true" \
  --require-approval never; then
  FAILED=true; exit 1
fi

echo ""
echo "✓ Frontend deployed to CloudFront"
