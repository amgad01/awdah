# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## v1.1.0

### Added

#### Backend

- Explicit early-return guard in `GetSalahDebtUseCase` and `GetSawmDebtUseCase`: users whose effective start date (bulugh or revert) is still in the future receive zero debt without entering the calculator

#### Frontend

- Responsive menu handling for public and authenticated layouts through a shared `useResponsiveMenu` hook
- About page platform metadata with version and stack details
- Password verification for destructive settings actions, including data export, prayer reset, fast reset, and account deletion
- E2E coverage for destructive settings flows that require password re-entry and reject incorrect passwords
- In-memory browser auth persistence for Cognito sessions so tokens stay out of browser storage
- Session state now survives a page refresh through in-memory caching plus `sessionStorage`
- Same guard added to the frontend `estimateSalahDebt` helper so the onboarding preview is consistent with the API response
- E2E test confirming that a logged-in session survives a page reload
- New `ApiClient` class with interceptor support, automatic retry logic, and request/response logging
- Centralized query invalidation helpers in `query-invalidation.ts` for consistent cache management
- Auth error normalization layer (`auth-errors.ts`) to prevent raw Cognito error messages from surfacing in user-facing toasts
- Shared `--font-family-display` and `--font-family-display-ar` CSS custom property tokens for consistent typography across the app
- Privacy page redesigned with hero section, sticky sidebar navigation, and structured article layout
- Expanded the quick glossary with additional core concepts used across the app, including `fard`, `faraid`, `hijra`, and `sunnah`
- Mobile swipe navigation for About and Contributing pages with touch gesture support
- New `useSwipe` hook for detecting horizontal swipe gestures on mobile
- `MobileSwipeableSections` component for swipeable card-based mobile layouts
- Tracker e2e coverage for Salah and Sawm now asserts the authenticated shell navigation before entering each page

### Changed

#### Pipeline

- Production deploy workflows now resolve the exact source branch and SHA before deploying, instead of relying on the default-branch context of `workflow_run`
- Production release numbering now prefers the `release/vX.Y.Z-*` branch prefix and reuses the same resolved version across backend deploy, Pages deploy, Git tag creation, and GitHub release publication
- Automatic production deploy chaining is now limited to `release/**` branches so release intent is explicit
- Deploy validation now runs as a credential-free pull-request dry run with placeholder frontend inputs instead of assuming an AWS role
- Shared composite actions now centralize release preparation and setup/build behavior across CI, deploy validation, backend deploy, and Pages deploy so SHA resolution cannot drift between workflows.
- Pages and backend release workflows now surface the computed release tag in the prepare job before environment approval, which makes the approved version visible in the Actions UI

#### Frontend

- Public and authenticated mobile navigation now use a compact burger menu with click-outside dismissal
- About page mobile layout restructured: static sections at top/bottom, team members in swipeable slider
- Contributing page mobile layout restructured: static hero/recognition, contribution areas in swipeable slider
- Privacy page mobile spacing now uses logical alignment and centered content for a cleaner narrow-screen layout
- Dashboard mobile layout optimized to reduce scrolling before prayer logger access
- Dashboard SnapshotGrid hidden on mobile to eliminate duplicate information
- Privacy content now renders consistently in the public shell and authenticated overlay flow
- Release/versioning now derives the app and release version from `release/vX.Y.Z-*` branch prefixes when present, while still allowing explicit Pages overrides
- Release/versioning guidance lives in `CONTRIBUTING.md`, with contributor-facing content kept in sync across locales
- About now owns app/version metadata; Settings no longer repeats it
- English, Arabic, and German copy were updated to use more generic, future-proof product wording
- Shared design values were moved into CSS custom properties to reduce repeated sizing and transition definitions
- Language switcher responsive behavior now uses a shared breakpoint constant instead of a hardcoded inline pixel value
- API layer refactored from inline `fetch` calls to centralized `ApiClient` with standardized error handling
- Brand lockup and auth title typography now use centralized CSS token instead of inline font stacks

#### Backend

- DynamoDB create-only writes now escape partition key names in conditional expressions so reserved or table-specific names do not break inserts
- Extracted shared `computeQadaaBuckets` helper in `DynamoDBPrayerLogRepository` to eliminate duplication between `countQadaaCompleted` and `countQadaaCompletedByPrayer`
- Prayer-slot bucketing now uses a shared helper so qadaa history/count logic stays consistent across repositories and use-cases

### Fixed

#### Pipeline

- GitHub Pages releases no longer auto-increment from unrelated historic tags when deploying a release branch
- Release tags and GitHub releases now target the actual branch commit being deployed instead of the default branch HEAD during chained workflow runs
- GitHub Pages release tagging now falls back safely when the current ref is not a `release/vX.Y.Z-*` branch, which prevents empty-tag pipeline failures
- `workflow_run` release workflows now explicitly resolve the branch HEAD through a shared helper instead of trusting the stale queued SHA, which fixed the repeated `v1.0.1` and `v1.0.2` drift
- Deploy scripts no longer print false failure banners after a successful frontend deploy
- Fixed `deploy-frontend.sh` false failure detection bug
- Fixed `deploy.sh` syntax error from duplicate lines
- Fixed smoke-test script to use `mktemp` for temp file, eliminating race condition when multiple CI instances run concurrently
- Fixed `alarm-stack.ts` to use `hasLifecycleJobDlq` guard property instead of directly accessing the throwing getter so the conditional alarm is properly skipped when the Lambda is absent
- Hardened `deploy.sh` context argument quoting to use `--context=key=value` form, preventing shell injection if a git tag contains special characters

#### Infrastructure

- Docker Compose now starts the backend runtime image successfully by copying the backend workspace node_modules into the final image, which restores runtime resolution for `zod`
- LocalStack reset scripts now target the real `Awdah-*` table names and key schema used by the backend
- DynamoDB throttle alarms now aggregate the main read, write, and scan operations instead of monitoring `GetItem` alone
- Expanded production environment detection for table deletion protection (`prod`, `production`, `live`)
- LocalStack reset scripts and DynamoDB table references now use the real `Awdah-PascalCase-{env}` naming convention (e.g. `Awdah-PrayerLogs-dev`) consistent with CDK stack definitions

#### Frontend

- Pre-push hook now defaults to the lightweight gate so local pushes are not blocked by the Node 22 jsdom worker crash; the full gate remains available via `RUN_FULL_PRE_PUSH=1`
- Glossary tooltips now use a softer elevated surface and better wrap long definitions on small screens
- Settings glossary tooltips now render with a more readable elevated surface treatment
- Dashboard hero and snapshot sections now scale down more cleanly on narrow screens
- Qadaa make-ups remain available in the prayer logger without requiring today's obligatory prayers first, and the unused unlock-warning translation key was removed from the locale files
- Export downloads retry while the lifecycle-job artifact is still propagating, which avoids false not-found failures after the job completes
- Reset actions now surface failures instead of failing silently when password verification or mutation work does not succeed
- Browser auth tokens are no longer persisted in browser storage
- Onboarding drafts once again derive their encryption secret from the active session token instead of a predictable user identifier
- Fixed mobile navigation burger button visibility with solid background and shadow
- Fixed bulugh early warning to display in amber/orange warning colour instead of muted grey
- Password verification for destructive actions (export, reset, delete) now uses a dedicated `verifyPassword` method that confirms credentials without replacing the active Cognito session
- Fixed `signingOut` guard in `api.ts` to reset in a `finally` block so subsequent 401 responses after sign-out are handled correctly
- Generic auth and service failures now keep their explicit message when the app has no structured translation key to use
- Removed unreachable code in export download retry loop
- Fixed memory leak in API client request timer tracking (removed ineffective `WeakSet`)
- Fixed resource leak in export download handler (DOM element cleanup now in `finally` block)
- Added jitter to exponential retry backoff to prevent thundering herd
- Added debug logging for `GlobalSignOut` failures instead of silent swallowing
- Added explicit `exact: true/false` flags to all query invalidations for precise cache targeting
- Hijri date picker no longer constructs dates at local midnight, which caused off-by-one Hijri date errors for users in positive UTC offset timezones
- `isDeleteAccountResult` type guard now requires `authDeleted` to be a `boolean`; previously `undefined` was treated as a valid value, creating ambiguity in the partial-cleanup notice path
- Zod future-date refinements on practicing period and settings schemas now return `true` in the catch branch so an unparsable date surfaces the field-level "Invalid Hijri date" error instead of the misleading "cannot be in the future" message
- The settings page now resets unsaved profile edits when the user starts interacting with practicing periods, so stale birthday/bulugh drafts do not block or leak into later saves
- The profile save button now considers the actual draft fields, not only the resolved bulugh date, so birthday and bulugh mode edits can be saved even when they resolve to the same effective date

#### Docs

- Documented the public auth query parameter contract (`?auth=login|signup|forgot`) so the initial auth view behavior is explicit for contributors

---

## [1.0.0] - 2026-04-03

Initial public release.

### Added

- Qadaa debt calculator for missed prayers (Salah) and fasts (Sawm)
- Daily Salah tracker with five-prayer log
- Daily qadaa logger against calculated debt
- Dashboard with remaining debt, streak, and completion projection
- History page with read-only past-day log
- Multilingual support: English, Arabic, German; full RTL layout
- Dark mode respecting `prefers-color-scheme` with manual override
- Offline demo mode with static sample data (no login required)
- Full-stack serverless architecture: React + AWS Lambda + DynamoDB + Cognito
- CDK-managed infrastructure across six stacks: Data, Auth, API, Backup, Alarms, Frontend
- GitHub Pages production frontend with CloudFront fallback option
- LocalStack-based local development environment (no AWS account required)
- CI/CD via GitHub Actions: lint, typecheck, build, test, E2E, deploy pipelines

---

[1.0.0]: https://github.com/amgad01/awdah/releases/tag/v1.0.0
