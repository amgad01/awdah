#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/node_modules/brace-expansion"
TARGET_DIR="$ROOT_DIR/node_modules/aws-cdk-lib/node_modules/brace-expansion"

if [[ ! -d "$SOURCE_DIR" || ! -d "$TARGET_DIR" ]]; then
  exit 0
fi

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
