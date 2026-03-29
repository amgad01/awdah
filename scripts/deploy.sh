#!/usr/bin/env bash
set -euo pipefail

# --- 0. Initial Setup & Trap ---
FAILED=true
trap 'if [ "$FAILED" = true ]; then echo ""; echo "x Deploy FAILED - check output above for errors."; fi' EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# --- 1. AWS Session Check ---
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

# --- 2. Configurations & Flags ---
SKIP_BOOTSTRAP=false
SKIP_BUILD=false
HOTSWAP_FLAG=""
PARALLEL_FLAG=""

# Interactive mode if no arguments are provided
if [ "$#" -eq 0 ]; then
  echo "Deployment Modes:"
  echo "  1) Full Deployment : Standard complete deploy (Bootstrap + Build + Synth + Deploy)"
  echo "  2) Quick Deployment: FAST. Skips setup + uses Hotswap + Parallel stacks"
  echo "  3) Hotswap Only    : Use for Lambda-only changes (near-instant)"
  echo "  4) Skip Setup Only : Skips one-time setup but does a full stack update"
  echo "  5) Cancel"
  echo ""
  
  read -p "Choose a number (1-5): " MODE_CHOICE
  case $MODE_CHOICE in
    1) ;; # Full Deployment
    2) SKIP_BOOTSTRAP=true; SKIP_BUILD=true; HOTSWAP_FLAG="--hotswap"; PARALLEL_FLAG="--concurrency 5" ;;
    3) SKIP_BOOTSTRAP=true; SKIP_BUILD=true; HOTSWAP_FLAG="--hotswap" ;;
    4) SKIP_BOOTSTRAP=true; SKIP_BUILD=true ;;
    5) echo "Aborted."; exit 0 ;;
    *) echo "Invalid choice. Defaulting to Full Deployment." ;;
  esac
  echo ""
fi

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-bootstrap) SKIP_BOOTSTRAP=true ;;
    --skip-build)     SKIP_BUILD=true ;;
    --hotswap)        HOTSWAP_FLAG="--hotswap" ;;
    --parallel)       PARALLEL_FLAG="--concurrency 5" ;;
    --quick)
      SKIP_BOOTSTRAP=true
      SKIP_BUILD=true
      HOTSWAP_FLAG="--hotswap"
      PARALLEL_FLAG="--concurrency 5"
      ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

echo "============================================"
echo "      Awdah - Full Stack Deploy             "
echo "--------------------------------------------"
echo "  Environment : $ENV"
echo "  Region      : $AWS_REGION"
echo "  Quick Mode  : $([ "$SKIP_BUILD" = true ] && echo "YES" || echo "NO")"
echo "  Hotswap     : $([ -n "$HOTSWAP_FLAG" ] && echo "YES" || echo "NO")"
echo "  Parallel    : $([ -n "$PARALLEL_FLAG" ] && echo "YES" || echo "NO")"
echo "  Alert Email : ${ALERT_EMAIL:-<none>}"
echo "============================================"
echo ""

# --- 3. Execution ---

# 3.1 Bootstrap
cd "$INFRA_DIR"
if [ "$SKIP_BOOTSTRAP" = false ]; then
  echo "=> [1/5] CDK bootstrap..."
  if ! npx cdk bootstrap --region "$AWS_REGION"; then
    exit 1
  fi
  echo ""
else
  echo "=> [1/5] Skipping bootstrap."
fi

# 3.2 Build shared
if [ "$SKIP_BUILD" = false ]; then
  echo "=> [2/5] Building shared package..."
  cd "$ROOT_DIR"
  if ! npm run build --workspace=packages/shared; then
    exit 1
  fi
  echo ""
else
  echo "=> [2/5] Skipping shared build."
fi

# 3.3 Build infra
if [ "$SKIP_BUILD" = false ]; then
  echo "=> [3/5] Building infra..."
  cd "$INFRA_DIR"
  if ! npm run build; then
    exit 1
  fi
  echo ""
else
  echo "=> [3/5] Skipping infra build."
fi

# 3.4 Synth
echo "=> [4/5] Synthesizing all stacks..."
cd "$INFRA_DIR"
CONTEXT_ARGS=(--context "env=$ENV")
[ -n "$ALERT_EMAIL" ] && CONTEXT_ARGS+=(--context "alertEmail=$ALERT_EMAIL")

if ! npx cdk synth --all "${CONTEXT_ARGS[@]}"; then
  exit 1
fi
echo ""

# 3.5 Deploy
BACKEND_STACKS=(
  "Awdah-data-stack-$ENV"
  "Awdah-auth-stack-$ENV"
  "Awdah-api-stack-$ENV"
  "Awdah-backup-stack-$ENV"
  "Awdah-alarm-stack-$ENV"
)

echo "=> [5/5] Deploying backend stacks..."
if ! npx cdk deploy \
  "${BACKEND_STACKS[@]}" \
  "${CONTEXT_ARGS[@]}" \
  $HOTSWAP_FLAG \
  $PARALLEL_FLAG \
  --outputs-file "$INFRA_DIR/outputs.json" \
  --require-approval never; then
  exit 1
fi
echo ""

# --- 4. Sync Configuration ---
"$SCRIPT_DIR/generate-frontend-config.sh"
echo ""

# --- 5. Success ---
FAILED=false
echo "============================================"
echo "      Backend deploy complete v             "
echo "============================================"
