#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/node_modules/brace-expansion"
TARGET_DIR="$ROOT_DIR/node_modules/aws-cdk-lib/node_modules/brace-expansion"

if [[ ! -d "$SOURCE_DIR" || ! -d "$TARGET_DIR" ]]; then
  exit 0
fi

mkdir -p "$TARGET_DIR/dist" "$TARGET_DIR/node_modules"
cp "$SOURCE_DIR/LICENSE" "$TARGET_DIR/LICENSE"
cp "$SOURCE_DIR/README.md" "$TARGET_DIR/README.md"
cp "$SOURCE_DIR/package.json" "$TARGET_DIR/package.json"
cp -R "$SOURCE_DIR/dist/." "$TARGET_DIR/dist/"

if [[ -d "$SOURCE_DIR/node_modules" ]]; then
  mkdir -p "$TARGET_DIR/node_modules"
  cp -R "$SOURCE_DIR/node_modules/." "$TARGET_DIR/node_modules/"
fi
