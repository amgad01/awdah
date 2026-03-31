#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

ENV="${1:-staging}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"

echo "▸ build-and-upload-frontend ($ENV)"

echo "▸ [1/3] Build shared package and frontend"
cd "$ROOT_DIR"
npm run build --workspace=packages/shared

VITE_API_BASE_URL="" \
  VITE_AUTH_MODE="cognito" \
  VITE_COGNITO_USER_POOL_ID="${VITE_COGNITO_USER_POOL_ID:-}" \
  VITE_COGNITO_CLIENT_ID="${VITE_COGNITO_CLIENT_ID:-}" \
  VITE_AWS_REGION="$AWS_REGION" \
  VITE_APP_VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo 'local')" \
  npm run build --workspace=apps/frontend

SITE_DIST_PATH="$ROOT_DIR/apps/frontend/dist"
if [ ! -d "$SITE_DIST_PATH" ]; then
  echo "✗ Frontend dist folder not found: $SITE_DIST_PATH"
  exit 1
fi

echo "▸ [2/3] Resolve existing Frontend stack bucket"
STACK_NAME="Awdah-frontend-stack-$ENV"
FRONTEND_BUCKET_NAME=$(aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

if [ -z "$FRONTEND_BUCKET_NAME" ] || [ "$FRONTEND_BUCKET_NAME" == "None" ]; then
  echo "✗ Cannot resolve Frontend bucket from $STACK_NAME. Ensure stack is deployed."
  exit 1
fi

echo "▸ [3/3] Sync dist folder to S3 bucket: $FRONTEND_BUCKET_NAME"
aws s3 sync "$SITE_DIST_PATH" "s3://$FRONTEND_BUCKET_NAME" --delete

echo "▸ [4/4] Invalidate CloudFront distribution (optional)"
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text)

if [[ "$FRONTEND_URL" =~ https://([^/]+) ]]; then
  DISTRIBUTION_DOMAIN="${BASH_REMATCH[1]}"
  DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?DomainName=='$DISTRIBUTION_DOMAIN'].Id | [0]" \
    --output text)

  if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
    echo "✓ CloudFront invalidation created for distribution $DISTRIBUTION_ID"
  else
    echo "⚠ CloudFront distribution for domain $DISTRIBUTION_DOMAIN not found. Skipping invalidation."
  fi
else
  echo "⚠ Could not parse FrontendUrl: $FRONTEND_URL. Skipping invalidation."
fi

echo "✔ build-and-upload-frontend completed"
