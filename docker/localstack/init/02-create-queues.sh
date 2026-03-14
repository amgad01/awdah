#!/bin/bash
# Creates SQS dead letter queues for async Lambda failures.
# Runs automatically on LocalStack first startup. Idempotent.
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"

create_queue_if_missing() {
  local queue_name="$1"
  if aws sqs get-queue-url \
      --queue-name "$queue_name" \
      --endpoint-url "$ENDPOINT" \
      --region "$REGION" > /dev/null 2>&1; then
    echo "[skip] $queue_name already exists"
  else
    aws sqs create-queue \
      --queue-name "$queue_name" \
      --attributes MessageRetentionPeriod=1209600 \
      --endpoint-url "$ENDPOINT" \
      --region "$REGION"
    echo "[ok]   $queue_name created"
  fi
}

# DLQ for the backup-export async Lambda
create_queue_if_missing "awdah-backup-export-dlq-dev"

echo "SQS queues ready."
