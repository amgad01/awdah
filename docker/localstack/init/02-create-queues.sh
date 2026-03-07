#!/bin/bash
# Creates SQS dead letter queues for async Lambda failures.
# Runs automatically on LocalStack first startup. Idempotent.

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"

# TODO: Create DLQ for backup-export Lambda
# TODO: Create DLQ for any other async Lambda handlers
