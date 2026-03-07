#!/bin/bash
# Seeds realistic fake data into DynamoDB tables for local development.
# Runs automatically on LocalStack first startup. Idempotent.

ENDPOINT="http://localhost:4566"
REGION="eu-west-1"

# TODO: Seed a test user into the users table
# TODO: Seed practicing periods for the test user
# TODO: Seed sample prayer logs across multiple dates
# TODO: Seed sample fast logs for a Ramadan period
