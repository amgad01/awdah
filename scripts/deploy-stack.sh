#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

# ── AWS Session Check ──
"$SCRIPT_DIR/check-aws-session.sh" || exit 1

load_env_defaults "$ROOT_DIR/.env"

ENV="${DEPLOY_ENV:-dev}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
STACK="${1:-}"

VALID_STACKS="data auth api backup alarm frontend"

if [ -z "$STACK" ]; then
  echo "Stack Descriptions:"
  echo "  - data    : Core persistence (DynamoDB Tables)"
  echo "  - auth    : Identity management (Cognito User Pool)"
  echo "  - api     : Business logic (Lambda handlers & HTTP API Gateway)"
  echo "  - backup  : Resilience (S3 Backup & Recovery flows)"
  echo "  - alarm   : Observability (CloudWatch Dashboard & SNS Alarms)"
  echo "  - frontend: User Interface (Web App bundle)"
  echo ""
  echo "Select a stack to deploy:"
  PS3="Choose a number (1-7): "
  select opt in $VALID_STACKS "cancel"; do
    if [ "$opt" = "cancel" ]; then
      echo "Aborted."
      exit 0
    elif [ -n "$opt" ]; then
      STACK="$opt"
      break
    else
      echo "Invalid selection."
    fi
  done
  echo ""
fi

if ! echo "$VALID_STACKS" | grep -qw "$STACK"; then
  echo "✗ Invalid stack '$STACK'. Must be one of: $VALID_STACKS"
  exit 1
fi

export AWS_DEFAULT_REGION="$AWS_REGION"
STACK_NAME="Awdah-${STACK}-stack-${ENV}"

if [ "$STACK" = "frontend" ] && [ "$(frontend_target_for_env "$ENV")" = "pages" ]; then
  echo "✗ The prod frontend is published through GitHub Pages, not the FrontendStack."
  echo "  Use ./scripts/deploy-frontend.sh $ENV instead."
  exit 1
fi

CONTEXT_ARGS=(--context "env=$ENV")
[ "$STACK" = "frontend" ] && CONTEXT_ARGS+=(--context "deployFrontend=true")

echo "▸ Deploying $STACK_NAME..."
cd "$INFRA_DIR"

if ! npx cdk deploy "$STACK_NAME" "${CONTEXT_ARGS[@]}" --require-approval never; then
  echo ""
  echo "✗ Failed to deploy $STACK_NAME"
  exit 1
fi

echo ""
echo "✓ $STACK_NAME deployed"
