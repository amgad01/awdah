# Database Architecture

Awdah uses DynamoDB with one table per major persistence concern. The design is deliberately simple: user-scoped partition keys, structured sort keys, and a small number of GSIs that match real read patterns.

## Table Summary

### 1. Prayer Logs

- Table name pattern: `Awdah-PrayerLogs-{env}` with optional ticket prefix in non-prod stacks
- Partition key: `userId`
- Sort key: `sk`
- GSI: `typeDateIndex` on `userId` + `typeDate`

The sort key encodes the Hijri date, prayer, and event ID so multiple events can exist for one prayer slot. This supports the append-only prayer ledger model.

### 2. Fast Logs

- Table name pattern: `Awdah-FastLogs-{env}`
- Partition key: `userId`
- Sort key: `sk`
- GSI: `typeDateIndex` on `userId` + `typeDate`

This table supports both date-scoped history reads and debt-related reconstruction without full scans.

### 3. Practicing Periods

- Table name pattern: `Awdah-PracticingPeriods-{env}`
- Partition key: `userId`
- Sort key: `periodId`

Practicing periods are user-scoped records used to exclude intervals from debt calculation.

### 4. User Settings

- Table name pattern: `Awdah-UserSettings-{env}`
- Partition key: `userId`
- Sort key: `sk`

This table stores profile and settings data that does not belong in the log tables.

### 5. User Lifecycle Jobs

- Table name pattern: `Awdah-UserLifecycleJobs-{env}`
- Partition key: `userId`
- Sort key: `sk`
- TTL attribute: `expiresAt`
- Stream: `NEW_IMAGE`

Lifecycle jobs cover export, delete-account, reset-prayers, and reset-fasts.

Important implementation details:

- job rows use an `sk` with a `JOB#...` pattern
- export payload chunks are also stored in this table under `JOB#...#CHUNK#...`
- TTL cleans up both job metadata and export chunks after the retention window
- the DynamoDB stream is used to trigger the background worker when a new pending job row is inserted
- the worker ignores export chunk rows and only processes real job rows

### 6. Deleted Users

- Table name pattern: `Awdah-DeletedUsers-{env}`
- Partition key: `userId`
- Sort key: `deletedAt`
- TTL attribute: `expiresAt`
- PITR enabled

This is the restore-sanitization ledger. It exists so restored tables can be cleaned before they are reused.

In practice, delete-account writes a tombstone here after app data has been deleted and before auth cleanup is finalized.

## Why Multi-Table Instead Of One Huge Table

The workload is not a generic event bus; it has a few stable aggregates with different retention and access patterns. Separate tables keep the intent clear:

- logs stay isolated from user settings
- lifecycle-job retention is independent
- deleted-user tombstones remain available for restore hygiene
- alarms and recovery flows can target the right resource directly

## Shared Defaults

Tables are created with the same operational defaults unless a table overrides them explicitly:

- `PAY_PER_REQUEST`
- PITR enabled by default
- environment-aware removal policy (`RETAIN` in prod, `DESTROY` elsewhere)

## Naming

CDK resource names follow:

```text
[ticket-]Awdah-{ResourceName}-{env}
```

The optional ticket prefix is only present when that context is supplied at deploy time. It is not a guaranteed branch-derived naming convention.
