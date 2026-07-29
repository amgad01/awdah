#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$ROOT_DIR/node_modules/brace-expansion"
TARGET_DIR="$ROOT_DIR/node_modules/aws-cdk-lib/node_modules/brace-expansion"
LOCKFILE="$ROOT_DIR/package-lock.json"
LOCK_KEY="node_modules/aws-cdk-lib/node_modules/brace-expansion"

if [[ ! -d "$SOURCE_DIR" || ! -d "$TARGET_DIR" ]]; then
  echo "patch-bundled-cdk-deps: skip (source or target missing)"
  exit 0
fi

PATCHED_VERSION="$(node -p "require('$SOURCE_DIR/package.json').version")"
echo "patch-bundled-cdk-deps: syncing brace-expansion ${PATCHED_VERSION} -> aws-cdk-lib nested copy"

if [[ -f "$SOURCE_DIR/LICENSE" ]]; then
  cp "$SOURCE_DIR/LICENSE" "$TARGET_DIR/LICENSE"
fi

if [[ -f "$SOURCE_DIR/README.md" ]]; then
  cp "$SOURCE_DIR/README.md" "$TARGET_DIR/README.md"
fi

if [[ -f "$SOURCE_DIR/package.json" ]]; then
  cp "$SOURCE_DIR/package.json" "$TARGET_DIR/package.json"
fi

if [[ -f "$SOURCE_DIR/index.js" ]]; then
  cp "$SOURCE_DIR/index.js" "$TARGET_DIR/index.js"
fi

if [[ -d "$SOURCE_DIR/dist" ]]; then
  mkdir -p "$TARGET_DIR/dist"
  cp -R "$SOURCE_DIR/dist/." "$TARGET_DIR/dist/"
fi

if [[ -d "$SOURCE_DIR/node_modules" ]]; then
  mkdir -p "$TARGET_DIR/node_modules"
  cp -R "$SOURCE_DIR/node_modules/." "$TARGET_DIR/node_modules/"
fi

# aws-cdk-lib bundles brace-expansion; overrides cannot rewrite inBundle entries.
# Keep lockfile version aligned so npm audit reflects the patched copy.
if [[ -f "$LOCKFILE" ]]; then
  node -e "
const fs = require('fs');
const lockPath = process.argv[1];
const key = process.argv[2];
const version = process.argv[3];
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const entry = lock.packages && lock.packages[key];
if (entry && entry.version !== version) {
  entry.version = version;
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  console.log('patch-bundled-cdk-deps: updated package-lock.json ' + key + ' -> ' + version);
}
" "$LOCKFILE" "$LOCK_KEY" "$PATCHED_VERSION"
fi
