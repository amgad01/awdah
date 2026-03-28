#!/bin/bash
# Seeds realistic fake data into DynamoDB tables for local development.
# Uses a fixed userId of 'local-dev-user' which matches the local auth bypass.
# Idempotent — put-item overwrites existing items safely.
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"

# Ensure credentials are set for aws-cli
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$REGION
ENV="dev"
USER_ID="local-dev-user"

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Seeding dev data for userId=${USER_ID}..."

# 1. User settings — bulugh date 1431-09-15, gender: male
# Use condition-expression so an existing item (with dateOfBirth etc.) is never overwritten.
aws dynamodb put-item \
  --table-name "Awdah-UserSettings-${ENV}" \
  --item "{
    \"userId\": {\"S\": \"${USER_ID}\"},
    \"sk\": {\"S\": \"SETTINGS\"},
    \"bulughDate\": {\"S\": \"1431-09-15\"},
    \"gender\": {\"S\": \"male\"},
    \"updatedAt\": {\"S\": \"${NOW}\"}
  }" \
  --condition-expression "attribute_not_exists(userId)" \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" 2>/dev/null || echo "[skip] user settings already exist"
echo "[ok] user settings"

# 2. Practicing period — 1440-01-01 to 1444-01-01 (gap period before this is the debt)
aws dynamodb put-item \
  --table-name "Awdah-PracticingPeriods-${ENV}" \
  --item "{
    \"userId\": {\"S\": \"${USER_ID}\"},
    \"periodId\": {\"S\": \"01JDEV00000PRACTICEPERIOD1\"},
    \"startDate\": {\"S\": \"1440-01-01\"},
    \"endDate\": {\"S\": \"1444-01-01\"},
    \"type\": {\"S\": \"both\"},
    \"createdAt\": {\"S\": \"${NOW}\"}
  }" \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION"
echo "[ok] practicing period"

# 3. Prayer logs — a few qadaa Fajr and Dhuhr logs
for sk_suffix in \
  "1445-01-05#FAJR#01JDEV0000PRAYER0001" \
  "1445-01-05#DHUHR#01JDEV0000PRAYER0002" \
  "1445-01-06#FAJR#01JDEV0000PRAYER0003" \
  "1445-01-07#ASR#01JDEV0000PRAYER0004"
do
  DATE_PART=$(echo "$sk_suffix" | cut -d'#' -f1)
  aws dynamodb put-item \
    --table-name "Awdah-PrayerLogs-${ENV}" \
    --item "{
      \"userId\": {\"S\": \"${USER_ID}\"},
      \"sk\": {\"S\": \"${sk_suffix}\"},
      \"type\": {\"S\": \"qadaa\"},
      \"loggedAt\": {\"S\": \"${NOW}\"},
      \"typeDate\": {\"S\": \"qadaa#${DATE_PART}\"}
    }" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"
done
echo "[ok] prayer logs"

# 4. Fast logs — a few qadaa fasts from Ramadan 1445
for sk_suffix in \
  "1445-09-01#01JDEV0000FAST000001" \
  "1445-09-02#01JDEV0000FAST000002" \
  "1445-09-03#01JDEV0000FAST000003"
do
  DATE_PART=$(echo "$sk_suffix" | cut -d'#' -f1)
  aws dynamodb put-item \
    --table-name "Awdah-FastLogs-${ENV}" \
    --item "{
      \"userId\": {\"S\": \"${USER_ID}\"},
      \"sk\": {\"S\": \"${sk_suffix}\"},
      \"type\": {\"S\": \"qadaa\"},
      \"loggedAt\": {\"S\": \"${NOW}\"},
      \"typeDate\": {\"S\": \"qadaa#${DATE_PART}\"}
    }" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"
done
echo "[ok] fast logs"

echo "Seed complete."
