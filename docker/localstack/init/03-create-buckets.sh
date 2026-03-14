#!/bin/bash
# Creates S3 buckets for backup exports.
# Runs automatically on LocalStack first startup. Idempotent.
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"
BUCKET="awdah-backups-dev"

if aws s3api head-bucket \
    --bucket "$BUCKET" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" > /dev/null 2>&1; then
  echo "[skip] $BUCKET already exists"
else
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" \
    --endpoint-url "$ENDPOINT"
  echo "[ok]   $BUCKET created"
fi

# Enable versioning so exports are never silently overwritten
aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION"

echo "S3 buckets ready."
