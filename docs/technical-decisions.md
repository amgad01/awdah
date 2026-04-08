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

---

## 5. Auth Token Storage — In-Memory Module Variable

Auth session tokens (Cognito access token, ID token, refresh token) are stored in a **module-level variable** (`inMemorySession`) in `auth-service.ts`, not in `localStorage` or `sessionStorage`.

### Why not `localStorage`?

`localStorage` persists across browser sessions. If a user closes the browser and another person opens it on the same device, the first user's tokens are still present and will silently authenticate as them on the next page load. This is a security risk on shared devices.

### Why not `sessionStorage` only?

`sessionStorage` is cleared when the tab closes, which is the correct lifetime for auth tokens. However, React's state (and module variables) are reset on a hard page refresh (`F5`), while `sessionStorage` survives it. Using `sessionStorage` as the sole store would cause a sign-out on every page refresh, which is unusable.

### The hybrid approach

- **Primary**: module-level variable — fast, zero serialization cost, automatically cleared when the tab closes.
- **Fallback**: `sessionStorage` — read-only on cold load (page refresh) to restore the session without forcing re-login within the same tab session.
- `sessionStorage` is written only when a new session is established and cleared immediately on sign-out.

### Why not React state?

React state is reset by Hot Module Replacement (HMR) during development, causing spurious sign-out loops. Module-level variables survive HMR. The session value is not display state — it is a singleton resource that belongs outside the component tree.

---

## 6. Password Re-Verification — `verifyPassword` vs `signIn`

### The problem

Destructive settings actions (data export, prayer reset, fast reset, account deletion) require the user to confirm their password before proceeding. The original implementation called `signIn(username, password)` for this check. `signIn` has an unacceptable side effect: it replaces the active Cognito session tokens, resetting the user's session mid-operation.

### The solution

A dedicated `verifyPassword(username, password): Promise<void>` method was added to the `AuthService` interface. It runs the full Cognito SRP authentication challenge to confirm credentials, but discards the resulting session tokens — it is a read-only credential check.

```typescript
async verifyPassword(username: string, password: string): Promise<void> {
  await this.cognitoClient.initiateAuth({ username, password });
  // Intentionally discard the response — credentials confirmed, session not replaced.
}
```

Both `CognitoAuthService` and `LocalAuthService` implement this method. The method throws if the credentials are wrong (Cognito raises `NotAuthorizedException`), which is all the caller needs to know.

---

## 7. Centralized API Client — Retry and Interceptor Pattern

All frontend HTTP requests go through a single `ApiClient` class instance rather than inline `fetch` calls.

### Why centralize?

- Retry logic (full-jitter exponential backoff for 408, 429, 5xx) must be consistent across all call sites.
- Auth headers must be injected from one place.
- Request and response logging should not be copy-pasted.
- Future cross-cutting concerns (correlation IDs, request signing) need a single hook point.

### Retry strategy

Full-jitter exponential backoff (`Math.floor(Math.random() * Math.min(base * 2^attempt, max))`) is used rather than fixed intervals. This prevents the thundering-herd effect — when many clients experience the same transient failure simultaneously, they spread their retries randomly across the backoff window instead of all retrying at the same instant. See "Exponential Backoff And Jitter" (AWS Engineering Blog, 2015).

### What is retried vs not retried

- **Retried**: `408` (request timeout), `429` (rate limited), `5xx` (server error).
- **Not retried**: `401`, `403`, `404` — these reflect stable state; retrying will not help and would amplify load.
