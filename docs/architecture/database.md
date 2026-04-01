# Database Architecture

Awdah uses Amazon DynamoDB as its primary data store. The architecture follows a multi-table design (Clean Architecture / DDD approach) where each bounded context manages its own table(s).

## Abstract Data Model Overview

### 1. Prayer Logs (`Awdah-PrayerLogs-{env}`)

Tracks all prayer-related activities (logged prayers, missed prayers, etc.).

- **Partition Key (`PK`)**: `userId` (String) - Cognito User ID.
- **Sort Key (`SK`)**: `sk` (String) - Typically `DATE#YYYY-MM-DD` or specific event IDs.
- **GSIs**:
  - `typeDateIndex`: Partition Key: `userId`, Sort Key: `typeDate` (e.g., `LOG#2026-03-10`) for efficient date-range queries.

### 2. Fast Logs (`Awdah-FastLogs-{env}`)

Tracks fasting history.

- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `sk` (String) - `DATE#YYYY-MM-DD`.
- **GSIs**:
  - `typeDateIndex`: Partition Key: `userId`, Sort Key: `typeDate`.

### 3. Practicing Periods (`Awdah-PracticingPeriods-{env}`)

Stores metadata about when a user started/stopped practicing, used for debt calculation.

- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `periodId` (String) - ULID for uniqueness and chronological order.

### 4. User Settings (`Awdah-UserSettings-{env}`)

Stores user-specific preferences (e.g., calculation methods, language).

- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `sk` (String) - Fixed value for simple settings (e.g., `SETTINGS`).

### 5. User Lifecycle Jobs (`Awdah-UserLifecycleJobs-{env}`)

Tracks background export and account-deletion work so heavy lifecycle operations do not stay on the request path.

- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `sk` (String) - `JOB#{jobId}` for metadata and `JOB#{jobId}#CHUNK#{index}` for export payload chunks.
- **TTL**: `expiresAt` removes old job metadata/export chunks automatically after the retention window.
- **Stream**: `NEW_IMAGE` stream is enabled so newly created pending jobs can trigger the background worker.

### 6. Deleted Users (`Awdah-DeletedUsers-{env}`)

Tombstone ledger used during backup restore sanitization.

- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `deletedAt` (String — ISO 8601 timestamp of deletion).
- **TTL**: `expiresAt` prunes old tombstones automatically after the configured retention window.
- **Restore flow**: after restoring data tables from PITR or S3, run the restore-sanitization script before the table is used again.

## Resource Isolation

To support parallel development on multiple feature branches, table names are prefixed with the ticket number (e.g., `123-Awdah-...`) when deployed from a feature branch. This ensures isolation and avoids conflicts with existing resources.
