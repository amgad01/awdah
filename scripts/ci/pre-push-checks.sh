#!/usr/bin/env bash
# pre-push-checks.sh
#
# Runs the same quality and build checks as the CI pipeline (ci.yml).
# Run this manually or via the Husky pre-push hook. All checks must pass
# for the script to exit cleanly.
#
# Independent steps within each phase run in parallel to reduce wall-clock time.
#
# Usage:
#   ./scripts/ci/pre-push-checks.sh                    # run all checks
#   SKIP_TESTS=1 ./scripts/ci/pre-push-checks.sh       # skip tests
#   RUN_E2E=1 ./scripts/ci/pre-push-checks.sh          # include frontend Playwright E2E
#   SKIP_BUILDS=1 ./scripts/ci/pre-push-checks.sh      # skip app builds (lint/typecheck/test only)
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

fail() {
  printf "${RED}✘ %s${RESET}\n" "$1"
}

# Run commands in parallel, fail if any exit non-zero.
# Usage: run_parallel "label1" "cmd1" "label2" "cmd2" ...
run_parallel() {
  _pids=""
  _labels=""
  _tmpdir=$(mktemp -d)
  _i=0

  while [ $# -ge 2 ]; do
    _label="$1"; shift
    _cmd="$1"; shift
    _i=$((_i + 1))

    ( eval "$_cmd" > "$_tmpdir/$_i.out" 2>&1 ) &
    _pids="$_pids $!"
    _labels="$_labels|$_label"
  done

  _failed=0
  _j=0
  for _pid in $_pids; do
    _j=$((_j + 1))
    _lbl=$(echo "$_labels" | cut -d'|' -f$((_j + 1)))
    if wait "$_pid"; then
      success "$_lbl"
    else
      fail "$_lbl"
      cat "$_tmpdir/$_j.out"
      _failed=1
    fi
  done

  rm -rf "$_tmpdir"
  if [ "$_failed" -ne 0 ]; then
    printf "\n${RED}${BOLD}One or more parallel checks failed.${RESET}\n"
    exit 1
  fi
}

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

# ── Phase 1: Build shared package (dependency for later phases) ──────────────
step "Phase 1/4: Build shared package"
npm run build --workspace=packages/shared
success "Shared package built"

step "Generate frontend language manifest"
npm run prelint --workspace=apps/frontend
success "Frontend language manifest generated"

# ── Phase 2: Lint, format & TypeScript (all independent, run together) ──────
# Root ESLint covers backend/infra/packages; frontend ESLint uses its own config.
step "Phase 2/4: Lint, format & TypeScript (parallel)"
run_parallel \
  "ESLint: backend / infra / packages" \
    "npm run lint -- --cache --cache-location .eslintcache" \
  "ESLint: frontend" \
    "npm run lint --workspace=apps/frontend -- --cache --cache-location apps/frontend/.eslintcache" \
  "Prettier format check" \
    "npm run format:check" \
  "TypeScript: root" \
    "npm run typecheck" \
  "TypeScript: backend" \
    "npm run typecheck --workspace=apps/backend" \
  "TypeScript: shared" \
    "npm run typecheck --workspace=packages/shared" \
  "TypeScript: frontend" \
    "npm run typecheck --workspace=apps/frontend"

# ── Phase 3: Tests ────────────────────────────────────────────────────────────
if [ "${SKIP_TESTS:-0}" = "1" ]; then
  warn "SKIP_TESTS=1, skipping tests (do not push without running tests first)"
else
  step "Phase 3/4: Tests (parallel)"
  run_parallel \
    "Tests: backend" \
      "npm run test --workspace=apps/backend" \
    "Tests: shared" \
      "npm run test --workspace=packages/shared --if-present" \
    "Tests: frontend" \
      "npm run test --workspace=apps/frontend --if-present"
fi

if [ "${SKIP_E2E:-0}" = "1" ]; then
  warn "SKIP_E2E=1, skipping frontend Playwright E2E"
elif [ "${RUN_E2E:-0}" = "1" ]; then
  step "Phase 3.5/4: Frontend E2E"
  npm run test:e2e --workspace=apps/frontend
  success "Frontend E2E passed"
else
  warn "RUN_E2E=1 not set, skipping frontend Playwright E2E"
fi

# ── Phase 4: Builds + security audit ─────────────────────────────────────────
if [ "${SKIP_BUILDS:-0}" = "1" ]; then
  warn "SKIP_BUILDS=1, skipping app builds"
  step "Phase 4/4: Security audit"
  npm audit --audit-level=high --workspace=apps/backend --workspace=apps/frontend --workspace=packages/shared --workspace=infra
  success "Security audit passed"
else
  step "Phase 4/4: Builds & audit (parallel)"
  run_parallel \
    "Build: backend"  "npm run build --workspace=apps/backend" \
    "Build: frontend" "npm run build --workspace=apps/frontend" \
    "Build: infra"    "npm run build --workspace=infra" \
    "Check: Pages build"  "npm run check:pages" \
    "Security audit"  "npm audit --audit-level=high --workspace=apps/backend --workspace=apps/frontend --workspace=packages/shared --workspace=infra"
fi

printf "\n${GREEN}${BOLD}All checks passed. Safe to push.${RESET}\n\n"
