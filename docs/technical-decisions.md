# Technical Decisions

This file records implementation decisions that shape the current codebase.

## 1. Hijri Dates Are The Domain Source Of Truth

The product domain is modelled in Hijri dates, not Gregorian dates.

- debt calculation uses Hijri spans
- prayer and fast logs are keyed by Hijri date
- Gregorian input is accepted as a convenience and converted at the boundary
- display code can show dual dates, but the stored business value stays Hijri

This avoids leaking display conventions into the business rules.

## 2. Prayer Logs Use An Append-Only Ledger

Prayer logging is not modelled as a mutable checkbox row. Each action writes a new event with an `action` of either `prayed` or `deselected`.

Why:

- repeated client submissions stay idempotent at the slot-state level
- deletion is representable without rewriting earlier history
- latest-event-wins state reconstruction is simple and explicit

The current visible prayer state for a `(date, prayerName)` pair is derived from the latest event for that slot.

## 3. Heavy User Operations Are Lifecycle Jobs

The backend does not keep expensive or destructive account operations on the request thread.

Current lifecycle-job types:

- `export`
- `delete-account`
- `reset-prayers`
- `reset-fasts`

Why:

- exports and destructive operations should not depend on a single API timeout window
- the client gets a stable polling contract instead of an overloaded synchronous request
- operational retries and failure reporting become explicit

## 4. Deleted Users Are Tracked In A Separate Tombstone Ledger

`DeletedUsers` is not an afterthought; it exists so restored data can be sanitized before reuse.

Why:

- PITR or S3 restores can resurrect user data that was deleted after the backup point
- a separate tombstone table gives recovery tooling a clean authority source
- the restore flow can remove deleted-user rows before the restored tables go live again

This is why restore sanitization is part of the documented recovery flow, not an optional cleanup step.

## 5. Frontend Auth Storage Uses A Hybrid Model

Auth tokens are not persisted in `localStorage`.

Current model:

- module-memory storage is the primary runtime source
- `sessionStorage` is only used to recover the session after a same-tab refresh

Why:

- `localStorage` survives across browser sessions and is a poor default for shared-device safety
- pure in-memory storage would force a sign-out on every refresh
- pure React state is too fragile around HMR and bootstrap timing

The hybrid approach keeps the normal session lifetime scoped to the browser tab without making refreshes unusable.

## 6. All Frontend HTTP Calls Go Through One API Client

The frontend uses a centralized API client rather than inline `fetch` scattered across features.

Why:

- auth header injection is centralized
- retry behavior is consistent
- debug logging is consistent
- future cross-cutting concerns have one integration point

Retry policy is intentionally narrow: retry transient failures such as `408`, `429`, network faults, and `5xx`; do not retry stable authorization or not-found failures.

## 7. Public Content Lives Outside The Main JS Bundle

The About, Contributing, and FAQ content is stored in runtime JSON files under `apps/frontend/public/data/`.

Why:

- contributors can update public content without touching component code
- the content model stays language-specific instead of being forced into the translation bundle
- public pages can ship partial translations with English fallback merging

The loader caches identical requests in memory so repeated remounts or language switches do not keep refetching the same English fallback files during a session.
