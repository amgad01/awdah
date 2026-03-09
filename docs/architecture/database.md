# Database Architecture

Awdah uses Amazon DynamoDB as its primary data store. The architecture follows a multi-table design (Clean Architecture / DDD approach) where each bounded context manages its own table(s).

## Abstract Data Model Overview

### 1. Prayer Logs (`Awdah-PrayerLogs-{env}`)
Tracks all prayer-related activities (logged prayers, missed prayers, etc.).
- **Partition Key (`PK`)**: `userId` (String) - Cognito User ID.
- **Sort Key (`SK`)**: `sk` (String) - Typically `DATE#YYYY-MM-DD` or specific event IDs.
- **GSIs**:
  - `GSI1`: Partition Key: `userId`, Sort Key: `typeDate` (e.g., `LOG#2026-03-10`) for efficient date-range queries.

### 2. Fast Logs (`Awdah-FastLogs-{env}`)
Tracks fasting history.
- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `sk` (String) - `DATE#YYYY-MM-DD`.
- **GSIs**:
  - `GSI1`: Partition Key: `userId`, Sort Key: `typeDate`.

### 3. Practicing Periods (`Awdah-PracticingPeriods-{env}`)
Stores metadata about when a user started/stopped practicing, used for debt calculation.
- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `periodId` (String) - ULID for uniqueness and chronological order.

### 4. User Settings (`Awdah-UserSettings-{env}`)
Stores user-specific preferences (e.g., calculation methods, language).
- **Partition Key (`PK`)**: `userId` (String).
- **Sort Key (`SK`)**: `sk` (String) - Fixed value for simple settings (e.g., `SETTINGS`).

## Resource Isolation
To support parallel development on multiple feature branches, table names are suffixed with the environment and/or ticket number (e.g., `-dev-123`) when deployed from a feature branch.
