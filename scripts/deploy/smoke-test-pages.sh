#!/usr/bin/env bash
# smoke-test-pages.sh
#
# Validates a deployed GitHub Pages frontend by checking that key routes
# respond correctly and the bundle is intact. Run after a Pages deploy.
#
# Usage:
#   ./scripts/deploy/smoke-test-pages.sh <site-url> [options]
#   ./scripts/deploy/smoke-test-pages.sh https://amgad01.github.io/awdah/
#
# Exit code:
#   0: all checks passed
#   1: one or more checks failed
set -euo pipefail

SITE_URL="${1:-${PAGES_SITE_URL:-https://amgad01.github.io/awdah/}}"
# Strip trailing slash for path construction, but keep the base as-is
SITE_BASE="${SITE_URL%/}"

PASS=0
FAIL=0
FAILURES=()

# Use a unique temp file per invocation to avoid race conditions when multiple
# instances of the script run concurrently (e.g. parallel CI jobs).
SMOKE_BODY=$(mktemp)
trap 'rm -f "$SMOKE_BODY"' EXIT

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

pass() {
  PASS=$((PASS + 1))
  printf "${GREEN}✔${RESET} %s\n" "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  FAILURES+=("$1")
  printf "${RED}✘${RESET} %s\n" "$1"
}

check_url() {
  local label="$1"
  local url="$2"
  local expected_pattern="${3:-}"
  local status

  status=$(curl --silent --output "$SMOKE_BODY" --write-out '%{http_code}' \
    --location --retry 4 --retry-delay 3 --retry-all-errors \
    --max-time 15 \
    "$url" 2>/dev/null || echo "000")

  if [ "$status" != "200" ]; then
    fail "$label (HTTP $status, expected 200)"
    return
  fi

  if [ -n "$expected_pattern" ]; then
    if ! grep -qF "$expected_pattern" "$SMOKE_BODY" 2>/dev/null; then
      fail "$label (missing expected content: '$expected_pattern')"
      return
    fi
  fi

  pass "$label"
}

echo ""
printf "${BOLD}▸ Smoke testing: %s${RESET}\n" "$SITE_URL"
echo ""

# 1. Home / root index.html
check_url "GET / (root index)" "$SITE_URL" "Awdah"

# 2. Root index should contain the base path in asset references
check_url "/ contains bundled assets" "$SITE_URL" "/awdah/assets/"

# 3. SPA 404 fallback, GitHub Pages serves 404.html for unknown paths,
#    the SPA then re-hydrates and routes to the correct page.
status_404=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --location --retry 2 --retry-delay 2 \
  --max-time 10 \
  "$SITE_BASE/non-existent-route-$(date +%s)" 2>/dev/null || echo "000")
if [ "$status_404" = "200" ] || [ "$status_404" = "404" ]; then
  pass "GET /non-existent-route returns 200 or 404 (SPA fallback)"
else
  fail "GET /non-existent-route returned unexpected status: $status_404"
fi

# 4. Static asset that must be present (favicon)
favicon_status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --retry 2 --max-time 10 \
  "$SITE_BASE/awdah/favicon.svg" 2>/dev/null || echo "000")
if [ "$favicon_status" = "200" ]; then
  pass "GET /awdah/favicon.svg (200)"
else
  # Try without the extra /awdah/ nesting (CNAME or custom domain deployments)
  favicon_status2=$(curl --silent --output /dev/null --write-out '%{http_code}' \
    --retry 2 --max-time 10 \
    "$SITE_BASE/favicon.svg" 2>/dev/null || echo "000")
  if [ "$favicon_status2" = "200" ]; then
    pass "GET /favicon.svg (200)"
  else
    fail "favicon.svg not found (tried $SITE_BASE/awdah/favicon.svg and $SITE_BASE/favicon.svg)"
  fi
fi

# 5. CSP meta tag present in index.html
if grep -qE "Content-Security-Policy|content-security-policy" "$SMOKE_BODY" 2>/dev/null; then
  pass "CSP meta tag present in index.html"
else
  fail "CSP meta tag NOT found in index.html"
fi

# 6. OG / social meta tags present
if grep -q "og:title" "$SMOKE_BODY" 2>/dev/null; then
  pass "OG meta tags present in index.html"
else
  fail "OG meta tags NOT found in index.html"
fi

# 7. Check site URL self-reference is correct (canonical URL in script)
if grep -qF "$SITE_URL" "$SMOKE_BODY" 2>/dev/null; then
  pass "Canonical site URL present in index.html"
else
  fail "Canonical site URL NOT found in index.html (expected: $SITE_URL)"
fi

echo ""
printf "${BOLD}Results: ${GREEN}%d passed${RESET}, ${RED}%d failed${RESET}\n" "$PASS" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  printf "${RED}${BOLD}Failed checks:${RESET}\n"
  for f in "${FAILURES[@]}"; do
    printf "  ${RED}✘${RESET} %s\n" "$f"
  done
  echo ""
  exit 1
fi

echo ""
exit 0
