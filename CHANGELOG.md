# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## v1.1.3

### Changed

#### Backend

- Dependency injection use-cases are now organized by context (`salah-use-cases.ts`, `sawm-use-cases.ts`, `user-use-cases.ts`) instead of one monolithic file
- Handler imports updated to pull from context-specific DI modules rather than the shared container
- `wrap-handler.ts` middleware refactored into smaller focused functions for request building, invocation metadata extraction, and error handling
- `create-handler.ts` now constructs request-scoped loggers with path and method context for better traceability
- `DynamoDBUserDataLifecycleService` now delegates query operations through the base repository method instead of constructing raw `QueryCommand` instances inline
- Base DynamoDB repository methods now consistently return typed results with `lastEvaluatedKey` instead of raw AWS SDK response shapes
- Domain entities now use strongly-typed value objects (`UserId`, `EventId`, `PeriodId`) instead of raw string identifiers; persistence layer uses dedicated mappers for conversion

### Fixed

#### Backend

- Prayer log persistence now mirrors other repositories by omitting key attributes from the payload during saves
- User lifecycle export queries only pass required expression attribute names to avoid DynamoDB validation errors
- Missing or partial user settings now return a 404 instead of a 500 during profile fetch

#### Frontend

- Prevent profile fetch errors from crashing the client when the server response omits an `error` payload
- Allow future bulugh dates during onboarding so users can record a future obligation date without validation errors
- Check-in prompt messages updated across English, Arabic, and German for improved clarity and user experience
- New pages artifacts generator script pre-builds public route metadata and HTML entry point for consistent static hosting

#### Infrastructure

- `FrontendStack` now deploys after `ApiStack` in CDK ordering to keep hosting paths aligned with the published API environment
- Removed unused `appEnv` context fallback from config resolution
- `AlarmStack` dependency graph updated: now depends on `BackupStack` directly since it monitors backup resources
- `ProcessUserLifecycleJobFn` Lambda now has read-only access to user data tables (`prayerLogsTable`, `fastLogsTable`, `practicingPeriodsTable`, `userSettingsTable`) instead of read-write, following least privilege principles
- Lambda environment variables consolidated into `baseEnv` in constructs to reduce duplication; environment variable handling now supports local fallbacks and warns on missing vars instead of throwing

#### Tooling

- `tsconfig.json` now includes `apps/backend/scripts/**/*.ts` for type checking utility scripts

### Removed

#### Backend

- `container.ts` and `services.ts` DI modules after use-case split
- Legacy HTTP route modules (`create-app.ts`, `route-registry.ts`, `salah-routes.ts`, `sawm-routes.ts`, `user-routes.ts`, `e2e-seed-routes.ts`)
- `local-handler-runner.ts` after migration to handler-first architecture
- `in-process-user-lifecycle-job-dispatcher.service.ts` after moving lifecycle dispatch behind the repository layer
- `responses.ts` helper after consolidating response utilities into `wrap-handler.ts`

#### Infrastructure

- `restore-from-s3.ts` and `restore-sanitize.ts` from `infra/scripts` after moving restore utilities into the backend workspace

## v1.1.2

### Changed

#### Frontend

- Public unauthenticated routes now use a shared shell-route config in `App.tsx`, which removes repetitive wrapper components while keeping the existing public-page UX intact
- The demo experience is now split into focused modules for data loading, section rendering, and shared date-display primitives instead of keeping everything inside one large page component
- Settings profile editing now routes its stateful rules through a dedicated controller hook and extracted field/render blocks instead of mixing form orchestration with a 600-line section component
- Settings practicing-period management now uses a dedicated controller hook and smaller row components instead of keeping validation, preview, mutation, and list rendering inside one section file
- Local browser-expiry flags now flow through a shared frontend storage helper, reducing repeated `localStorage` timestamp logic across Salah, Sawm, practice check-in, and onboarding draft handling
- The frontend now leans more on domain repositories and services for combined-history shaping, onboarding completion, user lifecycle workflows, and request cancellation instead of leaving those responsibilities inside screen-level hooks
- Locale metadata is now generated from the translation files during the frontend lifecycle, which preserves the “add one locale file” workflow while keeping full translation bundles lazy-loaded
- Public rich-text content blocks now support paragraph splitting and inline bold emphasis through a shared `RichText` renderer instead of ad-hoc text formatting inside page components
- Shared theme tokens now cover more chart, progress, and layout styling so major UI surfaces stop repeating raw visual values inline or per component
- The authenticated shell, history page, and settings screens now use thinner UI components with more controller-style hooks, which makes the main release-critical screens easier to change and reason about
- Public content sliders now share a built-in content-alignment option, which keeps centered card layouts consistent across the Contributing and About pages without page-specific slider overrides

#### Tooling

- Pre-push checks now generate the frontend language manifest before parallel lint/typecheck steps, which keeps local and CI output aligned for generated locale metadata
- The local Husky pre-push entrypoint now uses strict shell flags and `exec` handoff, reducing hook-shell edge cases while preserving quick vs full gate behavior
- Frontend language-manifest generation now formats output through Prettier, which keeps generated TypeScript stable for review and avoids noisy diffs
- A frontend-only upload command now syncs the built bundle to the existing S3 bucket and invalidates CloudFront without redeploying the stack, which shortens the cloud validation path for UI-only changes

### Fixed

#### Frontend

- Auth login, signup, and verification failures now render inline above the submit action instead of showing as toast notifications, and duplicate signup emails now offer sign-in or email-edit recovery actions
- Forgot-password request and confirmation failures now render inline above submit actions instead of using toast errors
- Practice-check-in, prayer uncheck suppression, and fast uncheck suppression now share the same safe expiry handling path instead of each implementing slightly different local storage logic
- Signup verification now shows the entered email in a read-only confirmation state and routes email changes back through the account-creation step, which makes the register-to-verify flow clearer and less awkward
- Read-query cancellation now flows through the repository and API-client layers, and aborted requests no longer retry as if they were real failures
- Public auth entry paths now have direct E2E coverage for `?auth=signup`, `?auth=forgot`, CTA handoff into signup, and the offline demo route
- Playwright shell navigation now goes through shared visible-target helpers, which stabilizes settings, history, tracker, dashboard, and logout coverage across desktop and mobile layouts
- The Contributing page now gives scholar reviewers direct LinkedIn and app-email contact actions, and contribution step lists keep their numbered guidance aligned correctly inside centered slider cards

### Removed

#### Frontend

- Unused `useSwipe` hook and its isolated test, because the current frontend no longer imports it in production code
- Redundant `user-lifecycle-jobs` pass-through module after lifecycle polling moved behind the user domain service layer

## v1.1.1

### Changed

#### Frontend

- Public auth CTAs now use query-driven routing, so Sign In and Create Account always reopen the dashboard auth forms even after navigating across public pages
- About and Contributing now use the new Swiper-based section slider where it matters most, with localized section IDs and more compact card layouts across mobile and desktop
- About now prefers the injected release version over duplicated content data, reducing drift between the live app version and the public metadata card
- Weekly overview wording was refreshed in English, German, and Arabic for a clearer explanation of recent rhythm vs total balance
- Settings practicing-period editing now uses an explicit Delete action with confirmation instead of the fragile inline `×` button
- The dashboard celebration hook no longer performs synchronous state updates inside an effect

#### Pipeline

- CI now runs on pull requests into `main`, on post-merge pushes to `main`, and on `release/**` pushes, while automatic production publishing remains limited to release branches
- Script-path cleanup is now complete across workflows, package scripts, infra package scripts, and contributor docs after the move to `scripts/ci`, `scripts/deploy`, `scripts/dev`, `scripts/test`, and `scripts/release`
- Deprecated deploy helper scripts were removed instead of being kept as redundant shell wrappers
- Production now keeps only the key dashboard and settings read Lambdas warm on a 15-minute schedule, which improves first-load latency without provisioned concurrency

### Fixed

#### Frontend

- Contributing sliders no longer stop after the first card in Arabic because each slider now receives the full localized item set instead of truncating to the first item
- The privacy page keeps its translated storage-copy content in English, German, and Arabic instead of hardcoding English replacements
- Tooltip placement now stays visible on mobile and flips correctly when shown above the trigger, including RTL Arabic layouts
- About and Contributing localized-content loaders no longer refetch repeatedly because they no longer depend on an unstable translation-function identity
- About, Contributing, and Learn now share the same localized-content loading flow instead of maintaining three slightly different implementations
- Signup password guidance now matches the enforced 12-character minimum instead of promising shorter passwords that still fail
- The unauthenticated mobile shell now centers the auth panel more cleanly and scrolls it into view when public CTAs forward the user to a form

#### Docs

- CI/CD documentation now reflects the actual post-merge `main` flow and the release-only publish lane

### Removed

- Deprecated `scripts/deploy/build-and-upload-frontend.sh` after the deploy flow was fully consolidated around `deploy-frontend.sh`
- Unused `MobileSwipeableSections` now that About and Contributing have moved to the shared Swiper-based section slider

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
- Deploy backend and Pages release workflows now scope concurrency to the source commit and split the protected approval into a dedicated gate job, so the approval screen shows the resolved tag and SHA before deployment starts
- Deploy Pages now waits for the matching backend deploy on the same commit before it proceeds, preventing Pages from racing ahead of the backend release

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
- DynamoDB throttle alarms now aggregate the main read, write, and scan operations instead of monitoring `GetItem` alone compling with CloudWatch limits

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
