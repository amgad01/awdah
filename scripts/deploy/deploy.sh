#!/usr/bin/env bash
set -euo pipefail

# --- 0. Initial Setup & Trap ---
trap 'status=$?; if [ "$status" -ne 0 ]; then echo ""; echo "x Deploy FAILED - check output above for errors."; fi' EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

# --- Help ---
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: deploy.sh [OPTIONS]

Full stack deployment for Awdah infrastructure and frontend.

Options:
  --skip-bootstrap    Skip CDK bootstrap (assumes already bootstrapped)
  --skip-build        Skip building shared packages and infra
  --skip-alarm-stack  Don't deploy the CloudWatch alarm stack
  --hotswap           Use CDK hotswap for faster Lambda deployments
  --parallel          Deploy stacks in parallel (concurrency 5)
  --quick             Equivalent to --skip-bootstrap --skip-build --hotswap --parallel
  --help, -h          Show this help message

Environment:
  DEPLOY_ENV          Target environment (dev/staging/prod, default: dev)
  AWS_DEFAULT_REGION  AWS region (default: eu-west-1)
  ALERT_EMAIL         Email address for CloudWatch alarm notifications

Examples:
  deploy.sh                          # Interactive mode (choose deployment mode)
  deploy.sh --quick                  # Fast deploy for Lambda-only changes
  deploy.sh --skip-alarm-stack       # Deploy without alarm stack
  DEPLOY_ENV=prod deploy.sh          # Deploy to production

EOF
  exit 0
fi

# --- 1. AWS Session Check ---
"$SCRIPT_DIR/check-aws-session.sh" || exit 1

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

ENV="${DEPLOY_ENV:-dev}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

export AWS_DEFAULT_REGION="$AWS_REGION"

# --- 2. Configurations & Flags ---
SKIP_BOOTSTRAP=false
SKIP_BUILD=false
SKIP_ALARM_STACK=false
HOTSWAP_FLAG=""
PARALLEL_FLAG=""

# Interactive mode if no arguments are provided
if [ "$#" -eq 0 ]; then
  echo "Deployment Modes:"
  echo "  1) Full Deployment : Standard complete deploy (Bootstrap + Build + Synth + Deploy)"
  echo "  2) Quick Deployment: FAST. Skips setup + uses Hotswap + Parallel stacks"
  echo "  3) Hotswap Only    : Use for Lambda-only changes (near-instant)"
  echo "  4) Skip Setup Only : Skips one-time setup but does a full stack update"
  echo "  5) Skip Alarm Stack: Deploy everything except the alarm stack"
  echo "  6) Cancel"
  echo ""
  
  read -p "Choose a number (1-6): " MODE_CHOICE
  case $MODE_CHOICE in
    1) ;; # Full Deployment
    2) SKIP_BOOTSTRAP=true; SKIP_BUILD=true; HOTSWAP_FLAG="--hotswap"; PARALLEL_FLAG="--concurrency 5" ;;
    3) SKIP_BOOTSTRAP=true; SKIP_BUILD=true; HOTSWAP_FLAG="--hotswap" ;;
    4) SKIP_BOOTSTRAP=true; SKIP_BUILD=true ;;
    5) SKIP_ALARM_STACK=true ;;
    6) echo "Aborted."; exit 0 ;;
    *) echo "Invalid choice. Defaulting to Full Deployment." ;;
  esac
  echo ""
fi

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-bootstrap) SKIP_BOOTSTRAP=true ;;
    --skip-build)     SKIP_BUILD=true ;;
    --skip-alarm-stack) SKIP_ALARM_STACK=true ;;
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
echo "  Skip Alarm  : $([ "$SKIP_ALARM_STACK" = true ] && echo "YES" || echo "NO")"
echo "  Alert Email : ${ALERT_EMAIL:-<none>}"
echo "============================================"
echo ""

# --- 3. Execution ---

# 3.1 Bootstrap
cd "$INFRA_DIR"
if [ "$SKIP_BOOTSTRAP" = false ]; then
  echo "=> [1/6] CDK bootstrap..."
  if ! npx cdk bootstrap --region "$AWS_REGION"; then
    exit 1
  fi
  echo ""
else
  echo "=> [1/6] Skipping bootstrap."
fi

# 3.2 Build shared
if [ "$SKIP_BUILD" = false ]; then
  echo "=> [2/6] Building shared package..."
  cd "$ROOT_DIR"
  if ! npm run build --workspace=packages/shared; then
    exit 1
  fi
  echo ""
else
  echo "=> [2/6] Skipping shared build."
fi

# 3.3 Build infra
if [ "$SKIP_BUILD" = false ]; then
  echo "=> [3/6] Building infra..."
  cd "$INFRA_DIR"
  if ! npm run build; then
    exit 1
  fi
  echo ""
else
  echo "=> [3/6] Skipping infra build."
fi

# 3.4 Synth
echo "=> [4/6] Synthesizing all stacks..."
cd "$INFRA_DIR"
CONTEXT_ARGS=(--context "env=${ENV}")
[ -n "$ALERT_EMAIL" ] && CONTEXT_ARGS+=("--context=alertEmail=${ALERT_EMAIL}")

CURRENT_BRANCH="$(git -C "$ROOT_DIR" branch --show-current || true)"
CURRENT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
RELEASE_TAG_OVERRIDE="${RELEASE_TAG_OVERRIDE:-${RELEASE_TAG:-}}"

# Resolve release tag deterministically from explicit input, release branch, or commit tag.
# Never fall back to the globally newest tag because that can point at another branch.
release_output_file="$(mktemp)"
if (
  cd "$ROOT_DIR"
  INPUT_RELEASE_TAG="$RELEASE_TAG_OVERRIDE" \
  TRIGGERING_HEAD_BRANCH="$CURRENT_BRANCH" \
  TRIGGERING_HEAD_SHA="$CURRENT_SHA" \
  GITHUB_OUTPUT="$release_output_file" \
  ./scripts/release/resolve-release-context.sh >/dev/null
); then
  RELEASE_TAG="$(grep '^release_tag=' "$release_output_file" | head -n 1 | cut -d= -f2-)"
  [ -n "$RELEASE_TAG" ] && CONTEXT_ARGS+=("--context=releaseTag=${RELEASE_TAG}")
  echo "Resolved release tag: ${RELEASE_TAG}"
else
  if [ "$ENV" = "prod" ]; then
    echo "Unable to resolve a deterministic release tag for prod deploy." >&2
    rm -f "$release_output_file"
    exit 1
  fi
  echo "No deterministic release tag found for env '$ENV'; continuing without releaseTag context."
fi
rm -f "$release_output_file"

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
)

if [ "$SKIP_ALARM_STACK" = false ]; then
  BACKEND_STACKS+=("Awdah-alarm-stack-$ENV")
fi

echo "=> [5/6] Deploying backend stacks..."
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

# --- 6. Deploy Frontend ---
echo "=> [6/6] Deploying frontend..."
"$SCRIPT_DIR/deploy-frontend.sh" "$ENV" || exit 1
echo ""

# --- 6. Success ---
FAILED=false
echo "============================================"
echo "      Full stack deploy complete            "
echo "============================================"
