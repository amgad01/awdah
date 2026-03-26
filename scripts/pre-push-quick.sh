#!/bin/sh
# pre-push-quick.sh
#
# Lightweight pre-push gate: lint + typecheck only. Runs in ~15–20 seconds.
# Tests, builds, and audit are deferred to the full pipeline (npm run check).
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

step() { printf "\n${BOLD}▶ %s${RESET}\n" "$1"; }
success() { printf "${GREEN}✔ %s${RESET}\n" "$1"; }
fail() { printf "${RED}✘ %s${RESET}\n" "$1"; }

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
    printf "\n${RED}${BOLD}Pre-push checks failed.${RESET}\n"
    printf "Run ${BOLD}npm run check${RESET} for the full pipeline.\n\n"
    exit 1
  fi
}

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

step "Build shared package"
npm run build --workspace=packages/shared
success "Shared package built"

step "Lint + TypeScript (parallel)"
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

printf "\n${GREEN}${BOLD}Pre-push checks passed.${RESET}\n"
printf "Run ${BOLD}npm run check${RESET} for the full pipeline (tests + builds + audit).\n\n"
