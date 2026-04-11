#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

show_help() {
  cat <<'EOF'
Usage: upload-frontend.sh [ENV] [--dry-run]

Build the frontend bundle, upload it to the existing frontend S3 bucket,
and invalidate the CloudFront distribution without deploying the stack.

Arguments:
  ENV          Target environment (default: dev or DEPLOY_ENV)

Options:
  --dry-run    Show the commands that would run without changing AWS resources
  --help, -h   Show this help message

Environment:
  DEPLOY_ENV             Target environment (default: dev)
  AWS_DEFAULT_REGION     AWS region (default: eu-west-1)
  SKIP_AWS_SESSION_CHECK Skip the AWS session validation when set to 1
  SKIP_SHARED_BUILD      Skip the shared package build when set to 1
EOF
}

DRY_RUN=false
ENV="${DEPLOY_ENV:-dev}"
ENV_SET=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      if [ "$ENV_SET" = false ]; then
        ENV="$arg"
        ENV_SET=true
      else
        echo "✗ Unexpected argument '$arg'."
        exit 1
      fi
      ;;
  esac
done

AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
STACK_NAME="${FRONTEND_STACK_NAME:-Awdah-frontend-stack-$ENV}"
TARGET="$(frontend_target_for_env "$ENV")"

if [ "$TARGET" != "cloudfront" ]; then
  echo "✗ Frontend upload only supports the CloudFront target."
  echo "  Use env '$ENV' or deploy the Pages flow for production."
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo "▸ Frontend upload target : $STACK_NAME"
  echo "▸ AWS region            : $AWS_REGION"
  echo "▸ Dry-run mode          : enabled"
  echo ""
  echo "Would run:"
  if [ "${SKIP_SHARED_BUILD:-0}" = "1" ]; then
    echo "  1) skip shared package build"
  else
    echo "  1) npm run build --workspace=packages/shared"
  fi
  echo "  2) npm run build --workspace=apps/frontend"
  echo "  3) aws s3 sync $DIST_DIR s3://<FrontendBucketName> --delete --exclude index.html --cache-control 'public,max-age=31536000,immutable'"
  echo "  4) aws s3 cp $DIST_DIR/index.html s3://<FrontendBucketName>/index.html --cache-control 'no-cache, no-store, must-revalidate' --content-type text/html"
  echo "  5) aws cloudfront create-invalidation --distribution-id <FrontendDistributionId> --paths '/*'"
  exit 0
fi

load_env_defaults "$ROOT_DIR/.env"

if [ "${SKIP_AWS_SESSION_CHECK:-0}" != "1" ]; then
  "$SCRIPT_DIR/check-aws-session.sh" || exit 1
fi

export AWS_DEFAULT_REGION="$AWS_REGION"

echo "▸ [1/4] Building frontend bundle..."
cd "$ROOT_DIR"
if ! "$SCRIPT_DIR/build-frontend.sh" "$ENV"; then
  echo ""
  echo "✗ Frontend build failed."
  exit 1
fi

echo ""
echo "▸ [2/4] Resolving frontend bucket..."
BUCKET_NAME="$(read_stack_output "$STACK_NAME" "FrontendBucketName" "$AWS_REGION")"
if [ -z "$BUCKET_NAME" ]; then
  echo "✗ Failed to read FrontendBucketName from $STACK_NAME"
  exit 1
fi

echo "▸ [3/4] Uploading frontend bundle to S3..."
aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET_NAME/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo ""
echo "▸ [4/4] Invalidating CloudFront cache..."
DISTRIBUTION_ID="$(
  aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "StackResources[?ResourceType=='AWS::CloudFront::Distribution'].PhysicalResourceId | [0]" \
    --output text
)"

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
  echo "✗ Failed to resolve CloudFront distribution ID from $STACK_NAME"
  exit 1
fi

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo ""
echo "✓ Frontend bundle uploaded"
echo "  Bucket       : $BUCKET_NAME"
echo "  Distribution : $DISTRIBUTION_ID"
