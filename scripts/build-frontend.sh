#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

load_env_defaults "$ROOT_DIR/.env"

ENV="${1:-${DEPLOY_ENV:-dev}}"
AWS_REGION="${VITE_AWS_REGION:-${AWS_DEFAULT_REGION:-eu-west-1}}"
TARGET="${FRONTEND_DEPLOY_TARGET:-$(frontend_target_for_env "$ENV")}"
PAGES_ORIGIN="${PAGES_ORIGIN:-https://amgad01.github.io}"
PAGES_BASE_PATH="$(normalize_base_path "${PAGES_BASE_PATH:-/awdah/}")"
PAGES_SITE_URL="${PAGES_SITE_URL:-$(compute_site_url "$PAGES_ORIGIN" "$PAGES_BASE_PATH")}"
PAGES_CNAME="${PAGES_CNAME:-}"
AUTH_MODE="${VITE_AUTH_MODE:-cognito}"
APP_VERSION="${VITE_APP_VERSION:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'local')}"
SKIP_SHARED_BUILD="${SKIP_SHARED_BUILD:-0}"

API_MODE="${FRONTEND_API_MODE:-}"
if [ -z "$API_MODE" ]; then
  case "$TARGET" in
    pages)
      API_MODE="direct"
      ;;
    cloudfront)
      API_MODE="same-origin"
      ;;
    *)
      echo "✗ Unsupported frontend target '$TARGET'."
      exit 1
      ;;
  esac
fi

HAS_AWS_SESSION=false
if aws_session_active; then
  HAS_AWS_SESSION=true
fi

resolve_env_or_stack_output() {
  local env_var_name="$1"
  local stack_name="$2"
  local output_key="$3"
  local description="$4"
  local current_value="${!env_var_name:-}"

  if [ -n "$current_value" ]; then
    printf '%s\n' "$current_value"
    return 0
  fi

  if [ "$HAS_AWS_SESSION" = true ]; then
    current_value="$(read_stack_output "$stack_name" "$output_key" "$AWS_REGION")"
    if [ -n "$current_value" ]; then
      printf '%s\n' "$current_value"
      return 0
    fi
  fi

  echo "✗ Missing $description."
  echo "  Export $env_var_name or make sure $stack_name is deployed and your AWS session is active."
  exit 1
}

AUTH_STACK_NAME="Awdah-auth-stack-$ENV"
API_STACK_NAME="Awdah-api-stack-$ENV"

USER_POOL_ID=""
USER_POOL_CLIENT_ID=""
if [ "$AUTH_MODE" != "local" ]; then
  USER_POOL_ID="$(resolve_env_or_stack_output \
    "VITE_COGNITO_USER_POOL_ID" \
    "$AUTH_STACK_NAME" \
    "UserPoolId" \
    "Cognito User Pool ID")"
  USER_POOL_CLIENT_ID="$(resolve_env_or_stack_output \
    "VITE_COGNITO_CLIENT_ID" \
    "$AUTH_STACK_NAME" \
    "UserPoolClientId" \
    "Cognito User Pool Client ID")"
fi

API_BASE_URL="${VITE_API_BASE_URL:-}"
case "$API_MODE" in
  same-origin)
    API_BASE_URL=""
    ;;
  direct)
    API_BASE_URL="$(resolve_env_or_stack_output \
      "VITE_API_BASE_URL" \
      "$API_STACK_NAME" \
      "ApiUrl" \
      "frontend API base URL")"
    ;;
  *)
    echo "✗ Unsupported FRONTEND_API_MODE '$API_MODE'. Use 'same-origin' or 'direct'."
    exit 1
    ;;
esac

BASE_PATH="/"
case "$TARGET" in
  pages)
    BASE_PATH="$PAGES_BASE_PATH"
    ;;
  cloudfront)
    BASE_PATH="/"
    ;;
  *)
    echo "✗ Unsupported frontend target '$TARGET'."
    exit 1
    ;;
esac

echo "▸ Frontend build target : $TARGET"
echo "▸ Deployment environment: $ENV"
echo "▸ API mode              : $API_MODE"
echo "▸ Base path             : $BASE_PATH"
if [ "$TARGET" = "pages" ]; then
  echo "▸ Pages URL             : $PAGES_SITE_URL"
fi
echo ""

if [ "$SKIP_SHARED_BUILD" != "1" ]; then
  echo "▸ [1/2] Building shared package..."
  npm run build --workspace=packages/shared
  echo ""
else
  echo "▸ [1/2] Skipping shared package build."
  echo ""
fi

echo "▸ [2/2] Building frontend bundle..."
BUILD_ENV=(
  "VITE_API_BASE_URL=$API_BASE_URL"
  "VITE_AUTH_MODE=$AUTH_MODE"
  "VITE_AWS_REGION=$AWS_REGION"
  "VITE_BASE_PATH=$BASE_PATH"
  "VITE_APP_VERSION=$APP_VERSION"
  "VITE_APP_VERSION=$APP_VERSION"
  "VITE_APP_EMAIL=${VITE_APP_EMAIL:-${ALERT_EMAIL:-}}"
)

if [ "$AUTH_MODE" != "local" ]; then
  BUILD_ENV+=("VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID")
  BUILD_ENV+=("VITE_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID")
fi

env "${BUILD_ENV[@]}" npm run build --workspace=apps/frontend
echo ""

if [ "$TARGET" = "pages" ]; then
  PATH_SEGMENTS_TO_KEEP="$(pages_path_segments_to_keep "$BASE_PATH")"

  if [ -f "$DIST_DIR/404.html" ]; then
    sed -i -E \
      "s/var pathSegmentsToKeep = [0-9]+;/var pathSegmentsToKeep = $PATH_SEGMENTS_TO_KEEP;/" \
      "$DIST_DIR/404.html"
  fi

  if [ -n "$PAGES_CNAME" ]; then
    printf '%s\n' "$PAGES_CNAME" > "$DIST_DIR/CNAME"
  else
    rm -f "$DIST_DIR/CNAME"
  fi
fi

echo "✓ Frontend build complete"
