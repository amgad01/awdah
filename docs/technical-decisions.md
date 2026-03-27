# Technical Decisions

This document records implementation-level decisions and their rationale. It is for developers. The first part covers Islamic domain rules that drive the calculations; the second part covers code and data design choices.

For the user-facing explanation of these rulings, see the Learn page inside the app (`public/data/faq-en.json` / `faq-ar.json`).

---

## Part 1 — Islamic Domain Rules

### 1.1 Hijri Calendar — Umm al-Qura

We use the **Umm al-Qura** calendar — the official civil Hijri calendar of Saudi Arabia and the most widely used standardised Hijri calendar globally. Every domain calculation uses this system. Gregorian dates are an input/display convenience only; conversion happens at the API boundary and never inside domain logic.

Real Hijri months are 29 or 30 days (a real year is ~354–355 days, not 360). Hardcoding 30 days per month produces a cumulative error that grows with the user's debt. The library resolves actual month lengths.

### 1.2 Bulugh (Age of Accountability)

A Muslim becomes legally accountable at puberty. Signs of bulugh: wet dream or seminal emission (male), onset of menstruation (female), or growth of coarse pubic hair. If none of these occur by **15 Hijri years from date of birth**, that age is the default — position of the Hanafi, Shafi'i, and Hanbali schools (_Sahih al-Bukhari_ 2664, _Sahih Muslim_ 1868).

The 15-year default is applied **only** when the user explicitly states they do not know — never silently assumed.

### 1.3 Salah Qadaa

Five obligatory prayers per day: Fajr, Dhuhr, Asr, Maghrib, Isha. Witr is not tracked in v1 (Hanafi position it as Wajib; the Maliki, Shafi'i, and Hanbali majority treat it as Sunnah Mu'akkadah — cross-madhab compatibility required a single choice). There is no scholarly expiry on qadaa; the obligation remains until fulfilled — consensus of all four madhabs (_Radd al-Muhtar_, _Minhaj al-Talibin_, _al-Mughni_).

### 1.4 Sawm Qadaa

Only Ramadan fasts are obligatory and subject to qadaa. Kaffarah (intentionally broken fasts) is out of scope for v1. Menstruation exemptions for women are out of scope for v1. Ramadan day counts (29 or 30) come from the Umm al-Qura library — no hardcoded values.

### 1.5 Reverts (Converts to Islam)

A revert's obligations begin at the moment of shahada, not at puberty. If the revert date is after bulugh, the revert date is used as the debt start. If the revert date is at or before bulugh, bulugh remains the start. Effective start = `max(bulugDate, revertDate)`.

### 1.6 Gap Period Calculation

Debt accumulates only during gaps in the user's practicing history:

- **Gap start:** bulugh date (or revert date, whichever is later)
- **Gap end:** start of the next practicing period, or today if the user is still not practicing
- **Excluded:** all practicing periods recorded by the user

Salah debt = total gap days × 5, minus logged qadaa prayers.
Sawm debt = total Ramadan days that fall within gap periods, minus logged qadaa fasts.

All results are non-negative integers.

---

## Part 2 — Technical Implementation

### 2.1 Hijri Calendar Implementation

The Umm al-Qura calendar is implemented through the shared `HijriDate` value object and the backend `UmAlQuraCalendarService`. The current implementation uses dedicated calendar libraries rather than relying on `Intl.DateTimeFormat` alone:

- `@umalqura/core` for backend calendar calculations
- `hijri-converter` inside `packages/shared/src/domain/value-objects/hijri-date.ts`

All domain calculations operate on Hijri dates. Gregorian conversion is used only at the presentation boundary when the UI needs to display Gregorian labels or convert Gregorian date input back into Hijri.

---

### 2.2 Date Storage Schema

**Prayer and fast logs** store the `date` field as a Hijri ISO-like date string (e.g. `1447-09-22`). The frontend may show Gregorian labels to the user, but requests and persistence are normalized to Hijri before the API call is made.

**Practicing periods** are stored as true Hijri date strings (e.g. `1447-09-22`). These are entered via the `HijriDatePicker` component and drive all qadaa debt calculations.

Debt calculation, history filters, and persistence stay on one calendar system. Any Gregorian UI controls must convert their values back to Hijri before querying or mutating backend data.

---

### 2.3 Practicing Periods — Why They Don't Auto-Fill Prayer Logs

When a user adds a practicing period spanning, say, three years, that represents over 5,000 individual prayer log rows (3 years × 365 days × 5 prayers). Creating those rows automatically would:

1. **Corrupt history** — every generated entry would carry the same `loggedAt` timestamp (the moment onboarding was saved), not the actual time each prayer was performed. The history view would show thousands of fake entries with identical timestamps.
2. **Invert exception handling** — if the user missed a prayer during an otherwise practicing period (illness, travel), they would need to _delete_ a generated row rather than simply not logging it. The mental model breaks.
3. **Create fragile bulk data** — editing or removing a multi-year period would require batch-deleting thousands of DynamoDB rows, creating latency spikes and partial-failure risk.

The debt calculator already derives correctness from practicing periods: it subtracts gap days from the total owed without reading any log rows for those dates. The history view applies the same logic — any calendar date that falls fully within a practicing period can be _displayed_ as implicitly complete without storing any log rows for it.

Explicit log entries are created only when the user actively logs a prayer or fast. An explicit `missed` override type for exceptions within practicing periods is planned for a future release.

**Current state in v1:**

- Debt calculation ✅ correctly accounts for practicing periods — no bulk rows required.
- History view ✅ shows explicitly logged entries plus practicing-period boundary events.
- Implicit "covered by period" display in history ⏳ planned for a future iteration.

---

### 2.4 Timezone Handling

All religious calculations (determining the current Hijri day, identifying which Ramadan a gap period covers) run in UTC. This avoids DST-related drift and ensures that a prayer logged on "1 Ramadan" remains "1 Ramadan" regardless of where the user travels.

User-facing date display converts to the user's local timezone at the presentation layer only.

---

### 2.5 Log Reset — Batch Delete Pattern

`DELETE /v1/salah/logs` and `DELETE /v1/sawm/logs` clear all log entries for the authenticated user. The implementation follows the same paginated batch-delete pattern used by `deleteAccount`:

1. Paginated `QueryCommand` projecting only `PK` and `SK` — no full item reads.
2. `BatchWriteCommand` in chunks of 25 (DynamoDB hard limit per batch).
3. User profile data, bulugh date, and practicing periods are untouched.

The reset operation is synchronous and returns only after all pages are confirmed deleted.

---

### 2.6 Momentum Calculation

Momentum is a two-part metric computed entirely on the frontend from a rolling history window. No value is stored — it is always derived at runtime.

**History window:** `useStreak` and `useStreakDetails` both fetch the last **365 Hijri days** of salah and sawm history. Increasing this from the original 120-day window means streaks of up to a full year are tracked accurately.

**Streak (consecutive days):**

```
computeConsecutiveStreak(activeDays):
  checkDay = today
  if today is not in activeDays:
    checkDay = yesterday   // grace: today counts if yesterday was active
  count = 0
  while checkDay is in activeDays:
    count++
    checkDay = checkDay − 1 Hijri day
  return count
```

A day is "active" if any qadaa salah log or qadaa sawm log carries that date. Obligatory (daily) prayers are excluded from the streak — the streak measures progress against historical debt, not daily practice.

**Activity rate (30-day rolling %):**

```
activityRate = (active days in last 30 Hijri days) / 30 × 100
```

This gives a smoother signal than the streak alone. A user who logs consistently but missed one day will still see a high activity rate even though their streak resets to 1.

**Milestone thresholds:** 3, 7, 14, 30, 60, 100 consecutive days. A milestone fires exactly once at each threshold, triggering a celebration message in the UI.

**Prayer-specific and per-type streaks** (computed in `useStreakDetails`):

- Per-prayer qadaa streak — consecutive days a specific prayer (e.g. Fajr) was logged as qadaa
- Obligatory streak — consecutive days all five daily obligatory prayers were marked done
- Monday/Thursday voluntary fast streak — consecutive weeks both days were logged
- Qadaa fast streak — consecutive days a qadaa fast was logged

All use `computeConsecutiveStreak` over their respective filtered day sets.

---

### 2.7 Scalable FAQ Content

FAQ content is served from static JSON files in `public/data/faq-en.json` and `public/data/faq-ar.json`. These files are fetched at runtime by `LearnPage` using the same pattern as `AboutPage`. Updating or adding FAQ entries requires only editing the JSON files and pushing — no npm build or redeployment of the React bundle is needed.

The i18n files (`en.json`, `ar.json`) retain only the UI chrome for the Learn page (page title, search labels, glossary headings, empty state messages). FAQ Q&A content is sourced exclusively from the runtime-fetched JSON files.

To add a new FAQ entry:

1. Add a new item object to the relevant section in `public/data/faq-en.json` and `public/data/faq-ar.json`.
2. Commit and push — GitHub Pages picks up the updated static files immediately.
