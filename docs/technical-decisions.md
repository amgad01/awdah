# Technical Decisions

This document records implementation-level decisions and their rationale. It is for developers.

---

## 1. Hijri Calendar — Umm al-Qura

We use the **Umm al-Qura** calendar — the official civil Hijri calendar of Saudi Arabia.

- Gregorian is an input/display convenience only.
- All domain logic uses Hijri.
- Library: `@umalqura/core`.

## 2. Salah Qadaa — Ledger & Idempotency

The app uses a ledger-style append-only log for prayers to support robust undo/redo and idempotency.

### 2.1 The `action` Field

Every log entry has an `action`: `prayed` or `deselected`.

- When a user logs a prayer: a `prayed` record is appended.
- When a user "unchecks" or deletes a prayer: a `deselected` record is appended.

The current state of any prayer slot is determined by the **latest** action for that `(date, prayerName)` pair.

### 2.2 Why no hard deletes?

1. **Auditability**: We preserve the history of user actions.
2. **Idempotency**: Repeated API calls (e.g. from a flaky mobile connection) append unique ULID-based events rather than conflicting on a single primary key.
3. **Recovery**: If a table is restored from a stale backup, the "deselected" records ensure the user's recent deletions are honored.

---

## 3. Account Deletion — Tombstone Pattern

When a user deletes their account, we perform a hard delete of all their data. However, backups (PITR or S3) may still contain their data for up to 90 days.

### 3.1 The `DeletedUsers` Table

To remain GDPR compliant after a restore, we maintain a small "Tombstone" table:

- **PK**: `userId`
- **SK**: `deletedAt`
- This table is **excluded** from backups. It is always live and authoritative.

### 3.2 Restore Sanitization

Any time a table is restored from S3 or PITR:

1. The `restore-sanitize.ts` script must be run.
2. It cross-references the live `DeletedUsers` table.
3. It batch-deletes any data in the restored table belonging to a tombstoned user.

### 3.3 Tombstone Pruning

Tombstone records are automatically deleted by **DynamoDB TTL** after **90 days** (using the `expiresAt` attribute). At this point, the S3 backups containing that user's data have transitioned to Glacier or expired, and the PITR window has closed.

---

## 4. Environment Validation

To allow specialized background tasks (like `TombstoneCleanupFn`) to run with minimal configuration, we support a `SKIP_ENV_VALIDATION` flag in `settings.ts`. This bypasses the mandatory check for all 6+ DynamoDB table names, allowing a script to run with only the single table it actually needs.
