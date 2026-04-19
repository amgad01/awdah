#!/usr/bin/env bash
set -euo pipefail

layer_dir="apps/backend/layer/nodejs"

if [ ! -f "$layer_dir/package.json" ]; then
  echo "Missing layer package manifest: $layer_dir/package.json" >&2
  exit 1
fi

if [ ! -f "$layer_dir/package-lock.json" ]; then
  echo "Missing layer lockfile: $layer_dir/package-lock.json" >&2
  exit 1
fi

if [ ! -d "$layer_dir/node_modules" ]; then
  echo "Layer dependencies were not installed: $layer_dir/node_modules" >&2
  exit 1
fi

layer_dependencies=()
while IFS= read -r name; do
  layer_dependencies+=("$name")
done < <(node -e "const layer=require('./$layer_dir/package.json'); for (const name of Object.keys(layer.dependencies || {})) console.log(name);")

for dependency in "${layer_dependencies[@]}"; do
  if [ ! -d "$layer_dir/node_modules/$dependency" ]; then
    echo "Missing layer dependency: $dependency" >&2
    exit 1
  fi
done

echo "Backend layer verified: ${#layer_dependencies[@]} dependencies installed"
