#!/bin/bash
# Creates all DynamoDB tables with correct key schema for local development.
# Runs automatically on LocalStack first startup. Idempotent.

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"

# TODO: Create users table (PK: userId)
# TODO: Create practicing-periods table (PK: userId, SK: periodId) with GSI userId-startDate-index
# TODO: Create prayer-logs table (PK: userId, SK: date#prayerName) with GSI userId-date-index
# TODO: Create fast-logs table (PK: userId, SK: date) with GSI userId-date-index
