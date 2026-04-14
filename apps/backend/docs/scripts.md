# Operational Scripts And Recovery

This file covers the repo scripts that matter most when data integrity, deployment safety, or recovery are on the line.

## 1. Restore From S3

Imports a DynamoDB export into a new target table.

```bash
npm run restore:s3 -- --bucket <name> --prefix <path> --table <target-table> --pk userId --sk sk
```

Full production-style example:

```bash
npm run restore:s3 -- \
  --bucket awdah-backups-prod-123456789012 \
  --prefix exports/2026-03-28/Awdah-PrayerLogs-prod \
  --table Awdah-PrayerLogs-prod-restored-20260328 \
  --pk userId \
  --sk sk \
  --region eu-west-1
```

Direct `ts-node` form:

```bash
npx ts-node -P apps/backend/tsconfig.scripts.json apps/backend/scripts/restore-from-s3.ts \
  --bucket awdah-backups-prod-123456789012 \
  --prefix exports/2026-03-28/Awdah-PrayerLogs-prod \
  --table Awdah-PrayerLogs-prod-restored-20260328 \
  --pk userId \
  --sk sk \
  --region eu-west-1
```

Properties:

- imports into the table name you provide
- does not overwrite a live table
- waits for the asynchronous DynamoDB import to complete

Why it exists:

- recovery should create a new table first
- operators need a safe inspection point before any cutover

## 2. Restore Sanitization

After restoring data, sanitize it before reuse.

```bash
npm run restore:sanitize -- --restored-tables <table1> <table2> --pk userId --sk sk
```

Full production-style example:

```bash
npm run restore:sanitize -- \
  --restored-tables \
  Awdah-PrayerLogs-prod-restored-20260328 \
  Awdah-FastLogs-prod-restored-20260328 \
  --pk userId \
  --sk sk \
  --tombstone-table Awdah-DeletedUsers-prod \
  --region eu-west-1
```

Direct `ts-node` form:

```bash
npx ts-node -P apps/backend/tsconfig.scripts.json apps/backend/scripts/restore-sanitize.ts \
  --restored-tables \
  Awdah-PrayerLogs-prod-restored-20260328 \
  Awdah-FastLogs-prod-restored-20260328 \
  --pk userId \
  --sk sk \
  --tombstone-table Awdah-DeletedUsers-prod \
  --region eu-west-1
```

LocalStack example:

```bash
npx ts-node -P apps/backend/tsconfig.scripts.json apps/backend/scripts/restore-sanitize.ts \
  --restored-tables Awdah-PrayerLogs-dev-restored-local \
  --pk userId \
  --sk sk \
  --tombstone-table Awdah-DeletedUsers-dev \
  --region eu-west-1 \
  --endpoint http://localhost:4566
```

What it does:

- reads the live `DeletedUsers` tombstone ledger
- finds restored data for deleted users
- removes those rows before the restored tables are put back into service

This step exists because a valid backup can still contain user data that was deleted after the backup point.

## 3. Deploy And Smoke-Test Helpers

These scripts matter operationally alongside the restore tools:

- `scripts/deploy/cdk-context.sh`: canonical `--context` flag builder for env, ticket, release tag, origin, custom domain, commit, and build metadata
- `scripts/deploy/cdk-stacks.sh`: canonical stack-name list for deploy, diff, and destroy paths
- `scripts/deploy/smoke-test-api.sh`: API smoke test for `/health` plus an anonymous `401` check
- `scripts/deploy/smoke-test-pages.sh`: frontend smoke test for both GitHub Pages and CloudFront URLs

## 4. Local Dev Utilities

- `scripts/dev/reset-prayers.sh`: clear prayer logs in LocalStack
- `scripts/dev/reset-fasts.sh`: clear fast logs in LocalStack
- `scripts/dev/setup-hybrid-dev.sh`: point the local frontend at an AWS-backed dev environment
- `scripts/test/load-burst-smoke.mjs`: small burst-load smoke test against a chosen base URL

## 5. Where To Read More

- Full public script inventory: [../../../scripts/README.md](../../../scripts/README.md)
- Private deep dive for the infra restore tools: [../../../docs/private/scripts/infra-scripts-deep-dive.md](../../../docs/private/scripts/infra-scripts-deep-dive.md)
