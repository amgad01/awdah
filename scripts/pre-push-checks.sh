#!/bin/sh
# pre-push-checks.sh
#
# Mirrors the CI pipeline (ci.yml) exactly so that failures are caught locally
# before reaching GitHub Actions. Run this manually or via the Husky pre-push
# hook. All checks must pass for the script to exit cleanly.
#
# Usage:
#   ./scripts/pre-push-checks.sh           # run all checks
#   SKIP_TESTS=1 ./scripts/pre-push-checks.sh   # skip tests (faster, use sparingly)

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
RESET='\033[0m'

step() {
  printf "\n${BOLD}▶ %s${RESET}\n" "$1"
}

success() {
  printf "${GREEN}✔ %s${RESET}\n" "$1"
}

warn() {
  printf "${YELLOW}⚠ %s${RESET}\n" "$1"
}

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

step "1/8 — Build shared package (required by backend & infra)"
npm run build --workspace=packages/shared
success "Shared package built"

step "2/8 — ESLint (all workspaces)"
npm run lint
success "ESLint clean"

step "3/8 — Prettier format check"
npm run format:check
success "Formatting clean"

step "4/8 — TypeScript: root"
npm run typecheck
success "Root typecheck passed"

step "4/8 — TypeScript: backend"
npm run typecheck --workspace=apps/backend
success "Backend typecheck passed"

step "4/8 — TypeScript: shared"
npm run typecheck --workspace=packages/shared
success "Shared typecheck passed"

step "5/8 — Build: backend"
npm run build --workspace=apps/backend
success "Backend build passed"

step "6/8 — Build: infra"
npm run build --workspace=infra
success "Infra build passed"

if [ "${SKIP_TESTS:-0}" = "1" ]; then
  warn "SKIP_TESTS=1 — skipping test steps (do not push without running tests first)"
else
  step "7/8 — Tests: backend (with coverage)"
  npm run test:coverage --workspace=apps/backend
  success "Backend tests passed"

  step "7/8 — Tests: shared"
  npm run test --workspace=packages/shared --if-present
  success "Shared tests passed"
fi

step "8/8 — Security audit (high severity)"
npm audit --audit-level=high --workspace=apps/backend --workspace=packages/shared --workspace=infra
success "Security audit passed"

printf "\n${GREEN}${BOLD}All checks passed. Safe to push.${RESET}\n\n"
