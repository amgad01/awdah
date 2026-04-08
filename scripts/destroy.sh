#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# --- Help ---
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: destroy.sh [OPTIONS]

Destroy all stacks in the specified environment.
⚠️  WARNING: This will delete ALL resources including databases!

Options:
  --help, -h    Show this help message

Environment:
  DEPLOY_ENV          Target environment (dev/staging/prod, default: dev)
  AWS_DEFAULT_REGION  AWS region (default: eu-west-1)

Examples:
  destroy.sh                    # Destroy dev environment (with confirmation)
  DEPLOY_ENV=prod destroy.sh    # Destroy production (requires 'destroy-prod' confirmation)

EOF
  exit 0
fi

# ── AWS Session Check ──
"$SCRIPT_DIR/check-aws-session.sh" || exit 1

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

ENV="${DEPLOY_ENV:-dev}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"

export AWS_DEFAULT_REGION="$AWS_REGION"

if [ "$ENV" = "prod" ]; then
  echo "⚠️  You are about to destroy the PRODUCTION environment."
  echo "   This will delete ALL resources including databases."
  echo ""
  read -rp "Type 'destroy-prod' to confirm: " CONFIRM
  if [ "$CONFIRM" != "destroy-prod" ]; then
    echo "Aborted."
    exit 1
  fi
else
  read -rp "Destroy all stacks in '$ENV'? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "▸ Destroying all stacks in $ENV..."

cd "$INFRA_DIR"
CONTEXT_ARGS=(--context "env=$ENV" --context "deployFrontend=true")

# Reverse dependency order
STACKS=(
  "Awdah-frontend-stack-$ENV"
  "Awdah-alarm-stack-$ENV"
  "Awdah-backup-stack-$ENV"
  "Awdah-api-stack-$ENV"
  "Awdah-auth-stack-$ENV"
  "Awdah-data-stack-$ENV"
)

ERRORS=0
for STACK in "${STACKS[@]}"; do
  echo "  ▸ Destroying $STACK..."
  if ! npx cdk destroy "$STACK" "${CONTEXT_ARGS[@]}" --force 2>/dev/null; then
    echo "  ⚠ $STACK — not found or already destroyed"
  fi
done

echo ""
echo "✓ Destroy complete for environment: $ENV"
