# Technical Decisions

This document records implementation-level decisions and their rationale. It is for developers, not end users. For the Islamic scholarly basis of the app's calculations, see [docs/religious-logic-faq.md](religious-logic-faq.md).

---

## 1. Hijri Calendar Implementation

The Umm al-Qura calendar is implemented through the shared `HijriDate` value object and the backend `UmAlQuraCalendarService`. The current implementation uses dedicated calendar libraries rather than relying on `Intl.DateTimeFormat` alone:

- `@umalqura/core` for backend calendar calculations
- `hijri-converter` inside `packages/shared/src/domain/value-objects/hijri-date.ts`

All domain calculations operate on Hijri dates. Gregorian conversion is used only at the presentation boundary when the UI needs to display Gregorian labels or convert Gregorian date input back into Hijri.

---

## 2. Date Storage Schema

### Prayer and fast logs

Prayer and fast log entries store the `date` field as a Hijri ISO-like date string (e.g. `1447-09-22`). The frontend may show Gregorian labels to the user, but requests and persistence are normalized to Hijri before the API call is made.

### Practicing periods

Practicing periods are stored as true Hijri date strings (e.g. `1447-09-22`). These are entered via the `HijriDatePicker` component and drive all qadaa debt calculations.

### Consequence

Debt calculation, history filters, and persistence stay on one calendar system. Any Gregorian UI controls must convert their values back to Hijri before querying or mutating backend data.

---

## 3. Practicing Periods — Why They Don't Auto-Fill Prayer Logs

### The problem with bulk auto-fill

When a user adds a practicing period spanning, say, three years, that represents over 5,000 individual prayer log rows (3 years × 365 days × 5 prayers). Creating those rows automatically would:

1. **Corrupt history** — every generated entry would carry the same `loggedAt` timestamp (the moment onboarding was saved), not the actual time each prayer was performed. The history view would show thousands of fake entries with identical timestamps.
2. **Invert exception handling** — if the user missed a prayer during an otherwise practicing period (illness, travel), they would need to _delete_ a generated row rather than simply not logging it. The mental model breaks.
3. **Create fragile bulk data** — editing or removing a multi-year period would require batch-deleting thousands of DynamoDB rows, creating latency spikes and partial-failure risk.

### The chosen approach — derived completion

The debt calculator already derives correctness from practicing periods: it subtracts gap days from the total owed without reading any log rows for those dates. The history view can apply the same logic — any calendar date that falls fully within a practicing period can be _displayed_ as implicitly complete without storing any log rows for it.

Explicit log entries are created only when the user actively logs a prayer or fast. An explicit `missed` override type for exceptions within practicing periods is planned for a future release.

### Current state in v1

- Debt calculation ✅ correctly accounts for practicing periods — no bulk rows required.
- History view ✅ shows explicitly logged entries plus practicing-period boundary events.
- Implicit "covered by period" display in history ⏳ planned for a future iteration. The remaining work is UX and exception handling for derived entries, not a calendar-schema mismatch.

---

## 4. Timezone Handling

All religious calculations (determining the current Hijri day, identifying which Ramadan a gap period covers) run in UTC. This avoids DST-related drift and ensures that a prayer logged on "1 Ramadan" remains "1 Ramadan" regardless of where the user travels.

User-facing date display converts to the user's local timezone at the presentation layer only.

---

## 5. Log Reset — Batch Delete Pattern

`DELETE /v1/salah/logs` and `DELETE /v1/sawm/logs` clear all log entries for the authenticated user. The implementation follows the same paginated batch-delete pattern used by `deleteAccount`:

1. Paginated `QueryCommand` projecting only `PK` and `SK` — no full item reads.
2. `BatchWriteCommand` in chunks of 25 (DynamoDB hard limit per batch).
3. User profile data, bulugh date, and practicing periods are untouched.

The reset operation is synchronous and returns only after all pages are confirmed deleted.
