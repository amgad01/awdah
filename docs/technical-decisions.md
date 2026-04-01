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

## 3. Account Deletion — Tombstones and Restore Hygiene

When a user deletes their account, the live data is removed and a tombstone record is kept in the deletion ledger. Backup media and restored copies may still contain historical user data until they are sanitized or expire according to the configured retention policy.

### 3.1 The `DeletedUsers` Table

The `DeletedUsers` table acts as the restore reference:

- **PK**: `userId`
- **SK**: `deletedAt`
- It is kept separate from the primary data tables and is treated as authoritative during restore hygiene.

### 3.2 Restore Sanitization

After restoring a table from S3 or PITR:

1. Run `infra/scripts/restore-sanitize.ts` against the restored table set.
2. Cross-reference the live `DeletedUsers` table.
3. Batch-delete any data in the restored table belonging to a deleted user before the table is put back into service.

### 3.3 Tombstone Pruning

Tombstone records are pruned by **DynamoDB TTL** using the `expiresAt` attribute. The retention window is intentionally longer than the backup window so we do not lose the restore reference before backup exports have expired.

---

## 4. Environment Validation

To allow operational scripts such as restore sanitization to run with minimal configuration, we support a `SKIP_ENV_VALIDATION` flag in `settings.ts`. This bypasses the mandatory check for all DynamoDB table names, allowing a script to run with only the tables it actually needs.
