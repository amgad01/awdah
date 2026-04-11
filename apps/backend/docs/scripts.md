# Operational Scripts And Recovery

This file documents the backend-facing recovery and maintenance scripts that matter when data integrity is on the line.

## Restore From S3

Imports a DynamoDB export into a new target table.

```bash
npm run restore:s3 -- --bucket <name> --prefix <path> --table <target-table> --pk userId --sk sk
```

Properties:

- imports into the table name you provide
- does not silently overwrite a live table
- waits for the asynchronous DynamoDB import to complete

## Restore Sanitization

After restoring data, sanitize it before reuse.

```bash
npm run restore:sanitize -- --restored-tables <table1> <table2> --pk userId --sk sk
```

What it does:

- reads the live `DeletedUsers` tombstone ledger
- finds restored data for deleted users
- removes those rows before the restored tables are put back into service

This step exists because a valid backup can still contain user data that was deleted after the backup point.

## Local Dev Utilities

- `scripts/dev/reset-prayers.sh`: clear prayer logs in LocalStack
- `scripts/dev/reset-fasts.sh`: clear fast logs in LocalStack
- `scripts/test/load-burst-smoke.mjs`: small burst-load smoke test against a chosen base URL

For the wider script inventory, use [../../../scripts/README.md](../../../scripts/README.md).
