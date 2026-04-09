#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

DIST_DIR="${1:-$ROOT_DIR/apps/frontend/dist}"
EXPECTED_SITE_URL="${2:-https://amgad01.github.io/awdah/}"
EXPECTED_BASE_PATH="$(normalize_base_path "${3:-/awdah/}")"
EXPECTED_PATH_SEGMENTS="$(pages_path_segments_to_keep "$EXPECTED_BASE_PATH")"

INDEX_FILE="$DIST_DIR/index.html"
NOT_FOUND_FILE="$DIST_DIR/404.html"

if [ ! -f "$INDEX_FILE" ]; then
  echo "✗ Missing Pages index file: $INDEX_FILE"
  exit 1
fi

if [ ! -f "$NOT_FOUND_FILE" ]; then
  echo "✗ Missing Pages 404 fallback file: $NOT_FOUND_FILE"
  exit 1
fi

if ! grep -Fq "$EXPECTED_SITE_URL" "$INDEX_FILE"; then
  echo "✗ index.html is missing the expected canonical site URL: $EXPECTED_SITE_URL"
  exit 1
fi

if ! grep -Fq "${EXPECTED_BASE_PATH}assets/" "$INDEX_FILE"; then
  echo "✗ index.html is not referencing hashed assets under $EXPECTED_BASE_PATH"
  exit 1
fi

if ! grep -Fq "var pathSegmentsToKeep = $EXPECTED_PATH_SEGMENTS;" "$NOT_FOUND_FILE"; then
  echo "✗ 404.html does not preserve the expected number of base-path segments ($EXPECTED_PATH_SEGMENTS)"
  exit 1
fi

echo "✓ Pages bundle paths verified for $EXPECTED_SITE_URL"

