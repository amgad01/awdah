#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

PORTS=(3000 4566 8080)

# Stop any Docker containers that have these ports bound
for port in "${PORTS[@]}"; do
  containers=$(docker ps --format '{{.ID}} {{.Ports}}' | grep ":${port}->" | awk '{print $1}' || true)
  if [ -n "$containers" ]; then
    echo "$containers" | xargs docker stop
    green "Stopped container(s) holding port $port"
  fi
done

# Bring down the compose stack
docker compose down --remove-orphans 2>/dev/null && green "Compose stack stopped" || true

# Kill host processes using ss (works without sudo)
for port in "${PORTS[@]}"; do
  pids=$(ss -tlnp "sport = :${port}" | awk 'NR>1 && /users:/ {match($0, /pid=([0-9]+)/, a); if (a[1]) print a[1]}' || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9
    green "Freed host port $port (pid $pids)"
  else
    dim "Port $port already free"
  fi
done
