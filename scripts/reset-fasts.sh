#!/usr/bin/env bash
# reset-fasts.sh — Deletes all fast log entries from the local DynamoDB
# (LocalStack). Useful during development to reset fasting history without
# touching the user profile or practicing periods.
#
# Usage:
#   ./scripts/reset-fasts.sh [USER_ID]
#
# If USER_ID is omitted, ALL fast log entries are removed.
# Run from the repo root. Requires Docker and the AWS CLI.

set -euo pipefail

ENDPOINT="http://localhost:4566"
TABLE="fast-logs-dev"
USER_ID="${1:-}"

echo "▶ Scanning table: $TABLE on $ENDPOINT"

if [[ -n "$USER_ID" ]]; then
  echo "  Filtering by userId = $USER_ID"
  ITEMS=$(aws dynamodb scan \
    --endpoint-url "$ENDPOINT" \
    --table-name "$TABLE" \
    --filter-expression "userId = :uid" \
    --expression-attribute-values "{\":uid\":{\"S\":\"$USER_ID\"}}" \
    --projection-expression "PK, SK" \
    --output json \
    --query "Items")
else
  ITEMS=$(aws dynamodb scan \
    --endpoint-url "$ENDPOINT" \
    --table-name "$TABLE" \
    --projection-expression "PK, SK" \
    --output json \
    --query "Items")
fi

COUNT=$(echo "$ITEMS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  Found $COUNT item(s) to delete"

if [[ "$COUNT" -eq 0 ]]; then
  echo "  Nothing to delete."
  exit 0
fi

# Batch-delete in chunks of 25 (DynamoDB limit)
echo "$ITEMS" | python3 - <<'PY'
import sys, json, subprocess, math

items = json.load(sys.stdin)
chunk_size = 25
chunks = [items[i:i+chunk_size] for i in range(0, len(items), chunk_size)]

for idx, chunk in enumerate(chunks, 1):
    delete_requests = [{"DeleteRequest": {"Key": {"PK": item["PK"], "SK": item["SK"]}}} for item in chunk]
    payload = json.dumps({"fast-logs-dev": delete_requests})
    result = subprocess.run(
        ["aws", "dynamodb", "batch-write-item",
         "--endpoint-url", "http://localhost:4566",
         "--request-items", payload],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  ERROR in chunk {idx}: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"  Deleted chunk {idx}/{len(chunks)} ({len(chunk)} items)")

print("✅ Done.")
PY
