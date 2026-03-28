# Operational Scripts & Data Recovery

This guide covers the technical scripts used for data recovery, GDPR-compliant sanitization, and maintenance.

## Data Recovery (GPDR & Compliance)

When restoring from a backup (PITR or S3), you MUST perform a sanitization pass to remove data belonging to users who deleted their accounts *between* the backup time and the present day.

These scripts are located in `infra/scripts/` and integrated into the root `package.json`.

### 1. Restore from S3
Imports a native DynamoDB JSON export from S3 into a fresh DynamoDB table.

```bash
# Using the root alias
npm run restore:s3 -- --bucket <name> --prefix <path> --table <new-table-name> --pk userId --sk sk
```

- **Safety First**: This script NEVER overwrites an existing production table. It always imports into a target table name you provide.
- **Polling**: Since DynamoDB imports are asynchronous, the script polls every 10 seconds until `COMPLETED`.

### 2. Restore Sanitize
Cross-references the live `DeletedUsers` tombstone table to "clean" a restored table.

```bash
# Using the root alias
npm run restore:sanitize -- --restored-tables <table1> <table2> --pk userId --sk sk
```

- **Logic**: It reads the *live* `DeletedUsers` table (which is never backed up) and batch-deletes any item in the *restored* table that matches a deleted `userId`.
- **Constraint**: Run this against the restored table BEFORE pointing your Lambda environment variables to it.

---

## Background Maintenance

### Tombstone Cleanup
Automated pruning of the `DeletedUsers` ledger.

- **Threshold**: Records older than 90 days are deleted.
- **Workflow**: Automated via EventBridge at 03:00 UTC.
- **Manual Check**:
  ```bash
  SKIP_ENV_VALIDATION=true DELETED_USERS_TABLE=Awdah-DeletedUsers-dev \
    npx ts-node -e "require('./apps/backend/src/shared/infrastructure/handlers/tombstone-cleanup.handler').handler()"
  ```

---

## Local Dev Utilities
Located in `scripts/`:

- `reset-prayers.sh` / `reset-fasts.sh`: Clear own logs (LocalStack only).
- `load-burst-smoke.mjs`: Benchmarks API Gateway rate limits (100 req/min).
