#!/bin/bash
# Creates all DynamoDB tables with correct key schema for local development.
# Runs automatically on LocalStack first startup. Idempotent.
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"
ENV="dev"

# Ensure credentials are set for aws-cli
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$REGION

create_table_if_missing() {
  local table_name="$1"
  shift
  if aws dynamodb describe-table \
      --table-name "$table_name" \
      --endpoint-url "$ENDPOINT" \
      --region "$REGION" > /dev/null 2>&1; then
    echo "[skip] $table_name already exists"
  else
    aws dynamodb create-table \
      --table-name "$table_name" \
      --endpoint-url "$ENDPOINT" \
      --region "$REGION" \
      "$@"
    echo "[ok]   $table_name created"
  fi
}

# 1. Prayer Logs — PK: userId, SK: sk, GSI1: userId + typeDate
create_table_if_missing "Awdah-PrayerLogs-${ENV}" \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=typeDate,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "typeDateIndex",
      "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "typeDate", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]'

# 2. Fast Logs — PK: userId, SK: sk, GSI1: userId + typeDate
create_table_if_missing "Awdah-FastLogs-${ENV}" \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=typeDate,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "typeDateIndex",
      "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "typeDate", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]'

# 3. Practicing Periods — PK: userId, SK: periodId
create_table_if_missing "Awdah-PracticingPeriods-${ENV}" \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=periodId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=periodId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# 4. User Settings — PK: userId, SK: sk
create_table_if_missing "Awdah-UserSettings-${ENV}" \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo "DynamoDB tables ready."
