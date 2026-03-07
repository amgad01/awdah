#!/bin/bash
# Creates S3 buckets for backup exports.
# Runs automatically on LocalStack first startup. Idempotent.

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"

# TODO: Create wafa-backups-dev bucket
# TODO: Enable versioning on the bucket
