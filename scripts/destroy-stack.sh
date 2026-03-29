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
STACK="${1:-}"

VALID_STACKS="data auth api backup alarm frontend"

if [ -z "$STACK" ]; then
  echo "Stack Descriptions:"
  echo "  - data    : Core persistence (DynamoDB Tables)"
  echo "  - auth    : Identity management (Cognito User Pool)"
  echo "  - api     : Business logic (Lambda handlers & AppSync API)"
  echo "  - backup  : Resilience (S3 Backup & Recovery flows)"
  echo "  - alarm   : Observability (CloudWatch Dashboard & SNS Alarms)"
  echo "  - frontend: User Interface (Web App bundle)"
  echo ""
  echo "Select a stack to destroy:"
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

CONTEXT_ARGS=(--context "env=$ENV")
[ "$STACK" = "frontend" ] && CONTEXT_ARGS+=(--context "deployFrontend=true")

echo "▸ Destroying $STACK_NAME..."
cd "$INFRA_DIR"

if ! npx cdk destroy "$STACK_NAME" "${CONTEXT_ARGS[@]}" --force; then
  echo ""
  echo "✗ Failed to destroy $STACK_NAME"
  exit 1
fi

echo ""
echo "✓ $STACK_NAME destroyed"
