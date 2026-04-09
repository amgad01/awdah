#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
LOCALSTACK_ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
LOCALSTACK_HEALTH_URL="$LOCALSTACK_ENDPOINT/_localstack/health"

# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

# --- Help ---
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: deploy-localstack.sh [STACK] [OPTIONS]

Deploy CDK stacks to LocalStack for local development.

Stacks:
  data      Core persistence (DynamoDB Tables)
  auth      Identity management (Cognito User Pool)
  api       Business logic (Lambda handlers & HTTP API Gateway)
  backup    Resilience (S3 Backup & Recovery flows)
  alarm     Observability (CloudWatch Dashboard & SNS Alarms)

Options:
  --help, -h    Show this help message

Environment:
  LOCALSTACK_ENDPOINT  LocalStack endpoint (default: http://localhost:4566)
  AWS_DEFAULT_REGION   AWS region (default: eu-west-1)

Examples:
  deploy-localstack.sh        # Interactive stack selection
  deploy-localstack.sh data   # Deploy data stack to LocalStack
  deploy-localstack.sh api    # Deploy API stack to LocalStack

EOF
  exit 0
fi

# ── LocalStack Health Check ──
echo -n "▸ Checking LocalStack... "
if ! curl -fsS "$LOCALSTACK_HEALTH_URL" >/dev/null 2>&1; then
  echo -e "\033[0;31mNOT REACHABLE\033[0m"
  echo ""
  echo "LocalStack is not running at $LOCALSTACK_ENDPOINT"
  echo "Start it with: docker compose up -d localstack"
  echo ""
  exit 1
fi
echo -e "\033[0;32mREADY\033[0m"
echo ""

AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
STACK="${1:-}"

VALID_STACKS="data auth api backup alarm"

if [ -z "$STACK" ]; then
  echo "Stack Descriptions:"
  echo "  - data    : Core persistence (DynamoDB Tables)"
  echo "  - auth    : Identity management (Cognito User Pool)"
  echo "  - api     : Business logic (Lambda handlers & HTTP API Gateway)"
  echo "  - backup  : Resilience (S3 Backup & Recovery flows)"
  echo "  - alarm   : Observability (CloudWatch Dashboard & SNS Alarms)"
  echo ""
  echo "Select a stack to deploy:"
  PS3="Choose a number (1-6): "
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

ENV="dev"
STACK_NAME="Awdah-${STACK}-stack-${ENV}"

CONTEXT_ARGS=(--context "env=$ENV")

echo "▸ Deploying $STACK_NAME to LocalStack..."
echo "   Endpoint: $LOCALSTACK_ENDPOINT"
echo ""
cd "$INFRA_DIR"

# Use dummy credentials for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION="$AWS_REGION"
export CDK_DEFAULT_ACCOUNT=000000000000
export CDK_DEFAULT_REGION="$AWS_REGION"

if ! npx cdk deploy "$STACK_NAME" "${CONTEXT_ARGS[@]}" \
  --require-approval never \
  --endpoint-url "$LOCALSTACK_ENDPOINT" \
  --profile default; then
  echo ""
  echo "✗ Failed to deploy $STACK_NAME to LocalStack"
  exit 1
fi

echo ""
echo "✓ $STACK_NAME deployed to LocalStack"
