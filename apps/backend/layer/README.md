# Lambda Dependencies Layer

This directory contains the shared dependencies layer for all Lambda functions.

## Purpose

The layer contains runtime dependencies that are shared across multiple Lambda functions
but are NOT part of the AWS SDK v3 (which is already included in the Lambda runtime).

## Included Dependencies

- `@umalqura/core` - Hijri date calculations
- `cors` - CORS middleware
- `express` - Web framework (for local dev, minimal runtime use)
- `http-status-codes` - HTTP status code constants
- `path-to-regexp` - URL path matching
- `pino` - Logging library
- `ulid` - Unique ID generation
- `zod` - Schema validation

## Why These Dependencies?

These packages are:

1. Used across multiple Lambda handlers
2. Not part of AWS SDK v3
3. Stable (rarely change between deployments)

## Excluded Dependencies

AWS SDK packages (`@aws-sdk/*`) are NOT included because:

- Lambda Node.js 22.x runtime already includes AWS SDK v3
- Including them would cause version conflicts
- It increases layer size unnecessarily

## Build Process

Run `npm run build:layer` from the backend directory to:

1. Install production dependencies into `layer/nodejs/node_modules/`
2. Keep `layer/nodejs/package-lock.json` in sync for clean CI builds
3. Leave the layer directory ready for CDK deployment

CI and deploy validation also run `./scripts/ci/verify-backend-layer.sh` to confirm the layer
contains every dependency declared in `layer/nodejs/package.json`.

## Adding New Dependencies

To add a new shared dependency:

1. Add it to `layer/nodejs/package.json`
2. Run `npm run build:layer`
3. Redeploy the infrastructure

The CDK automatically detects layer dependencies from `package.json`. No manual bundling list is required.
