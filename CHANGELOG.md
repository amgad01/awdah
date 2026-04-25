# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## v1.5.0

### Fixed

#### Backend

- **Semantic error code contract**: All backend use cases now throw `AppError` subclasses with semantic error codes (e.g. `SAWM_NO_QADAA_DEBT`) instead of i18n keys or raw strings. The `messages.ts` indirection file is removed; all six consumers import `ERROR_CODES` directly.
- **`download-export-data` raw error string**: Failed export jobs now always throw `ERROR_CODES.EXPORT_DOWNLOAD_FAILED` instead of passing `job.errorMessage` directly, which could bypass the frontend i18n map.
- **GSI projection bug (500 on qadaa log)**: `countQadaaCompleted` (fast logs) and `computeQadaaBuckets` (prayer logs) queried the `typeDateIndex` GSI via `findAllWithIndexPrefix`, which called `mapToDomain` on items that only carry GSI key attributes — causing `InternalError` on `decodeSk` and a 500 response. Fixed by adding `queryRawPages` to `BaseDynamoDBRepository` (projects `typeDate` only for fast logs; projects `sk` + bucketing fields for prayer logs).
- **`USER_SETTINGS_NOT_FOUND` i18n mapping**: Was incorrectly mapped to `common.task_not_found`. Now maps to `common.user_settings_not_found` with a dedicated message in all three locales.
- **Hardcoded strings in chart components**: `base-weekly-chart.tsx` error fallback and chart aria labels were hardcoded English strings. All now use `t()` with keys in EN, AR, and DE.

#### Frontend

- **Qadaa fast UI guard**: `SawmLogger` now disables the log button and guards the handler when `sawmDebt.remainingDays === 0`, matching the existing behaviour in the prayer logger.
- **`DeleteFastInput` missing `type` field**: The sawm delete mutation had no `type` field, preventing the debt cache from being updated client-side on delete. `type` is now included and the debt cache is updated directly.

### Changed

#### Frontend — Network request reduction

- **Zero extra requests on prayer/fast log and delete**: Log and delete mutations now update the TanStack Query cache directly instead of invalidating and refetching. Debt is updated via `updateSalahDebtCache`/`updateSawmDebtCache`; daily logs are updated via `appendSalahDailyLog`/`removeSalahDailyLog`/`appendSawmDailyLog`/`removeSawmDailyLog`; history is marked stale-only (`refetchType: 'none'`) so it refetches on next focus rather than immediately.
- **Zero extra requests on profile and period saves**: `useUpdateProfile`, `useAddPracticingPeriod`, `useUpdatePracticingPeriod`, and `useDeletePracticingPeriod` now write directly into the profile and periods caches via `updateProfileCache` and `updatePeriodsCache`. Only debt queries are invalidated (server must recompute). History is marked stale-only.
- **Deferred secondary queries on dashboard**: Streak, chart, and observed-rate history queries now wait until debt data has loaded (`debtLoaded` gate), reducing parallel requests on page open from 6 to 2 critical requests.
- **Domain-specific chart data hooks**: `SalahWeeklyChart` now uses `useSalahWeeklyChartData` (salah history only); `SawmWeeklyChart` uses `useSawmWeeklyChartData` (sawm history only). Previously both charts fetched both domains via `useWeeklyChartData`, causing a cross-domain history request on every page load.
- **Reset invalidation**: After a log reset completes, only the debt query is removed (forces immediate refetch to show 0); history is marked stale-only instead of being removed, eliminating the history refetch that followed every reset.
- **`invalidateAllWorshipQueries` history behaviour**: History is now always marked stale-only in this function, so profile/period saves no longer trigger immediate history refetches.

#### Frontend — UI & UX

- **Chart visual distinguishability**: Weekly worship charts use distinct colors, stroke widths, and dash patterns for obligatory and qadaa series.
- **Chart legend**: Legends are rendered from shared series configs (`SALAH_CHART_SERIES`, `SAWM_CHART_SERIES`, `COMBINED_CHART_SERIES`) with inline SVG swatches matching each line style.
- **Dashboard rate display**: The observed qadaa rate reflects actual logged activity over the last 7 days instead of the stepper counter.
- **Streak presentation**: Active obligatory, qadaa, and fasting streaks are surfaced separately with clearer title and empty-state behaviour.
- **Page charts**: Salah and Sawm pages include dedicated weekly charts and glossary-enhanced guidance text.
- **`useStreak` query reuse**: `useStreak` now delegates to `useStreakDetails`, eliminating duplicate 365-day history fetches.

#### Tooling

- **Deploy script alignment**: Release deploy scripts use a consistent `DEPLOY_ENV`-driven entrypoint.
- **Infra deploy script fix**: Infra deploy aliases point to the updated stack and all-stack script names.
- **CDK lock file ambiguity fixed**: `NodejsFunction` now sets `depsLockFilePath` to `package-lock.json` explicitly, resolving `MultipleLockFilesFound` CDK synthesis errors.
- **AI chat exports gitignored**: Added `q-dev-chat-*.md` to `.gitignore`.

### Refactored

#### Backend

- **`BaseDynamoDBRepository` DRY**: Added `queryRawPages` (paginated GSI query returning raw items without `mapToDomain`) and `existsAny` (efficient `Limit: 1` existence check). Both log repositories now use these instead of duplicating raw `QueryCommand` loops. `hasAnyLogs` in both repositories is a one-liner.
- **`LogFastUseCase` and `LogPrayerUseCase` simplified**: Reverted to their minimal form — idempotency check + save. Qadaa debt validation is enforced client-side where the debt data is already available, avoiding 2 extra DynamoDB reads per log call.

#### Frontend — Clean Architecture & DDD

- **`query-invalidation.ts` as the single cache authority**: All cache write operations (`updateSalahDebtCache`, `updateSawmDebtCache`, `appendSalahDailyLog`, `removeSalahDailyLog`, `appendSawmDailyLog`, `removeSawmDailyLog`, `updateProfileCache`, `updatePeriodsCache`, `markSalahHistoryStale`, `markSawmHistoryStale`, `invalidatePeriodRelatedQueries`) live in one file. No component or hook constructs cache keys or calls `setQueryData` directly.
- **`SeriesDef` consolidated**: `ChartSeriesConfig` in `domains/charts/types.ts` and `SeriesDef` in `base-weekly-chart.tsx` were structurally identical. `SeriesDef` is now the single canonical type in the charts domain.
- **`WorshipLog` consolidated**: `WorshipLogEntry` in the dashboard domain was identical to `WorshipLog` in the charts domain. `WorshipLogEntry` is removed; `computeObservedQadaaRate` uses `WorshipLog`.
- **`ObservedRateData` type used consistently**: `SalahDebtCard.observedRateData` now uses the exported `ObservedRateData` type instead of an inline structural type.
- **`t`/`fmtNumber` prop-drilling eliminated**: `BaseDebtCard`, `SalahDebtCard`, `SawmSummaryCard`, `StreakCard`, and `ToggleDetails` all call `useLanguage()` directly.
- **`invalidatePeriodRelatedQueries` promoted**: Moved from a private helper in `use-profile.ts` to a named export in `query-invalidation.ts`.
- **Domain-driven frontend**: Dashboard and chart logic live in `domains/dashboard/` and `domains/charts/` as pure TypeScript services.
- **Reusable card composition**: `BaseDebtCard` shared by `SalahDebtCard` and `SawmSummaryCard`; `ToggleDetails` and `RateStepper` extracted as focused primitives.

### Documentation

- **Error i18n contract**: Established the semantic-code-to-i18n-key flow.

---

## v1.4.0

### Added

#### Infrastructure

- **Lambda Dependencies Layer**: New shared Lambda layer containing backend runtime dependencies (`zod`, `pino`, `ulid`, `cors`, `express`, `@umalqura/core`, `http-status-codes`, `path-to-regexp`)
- **Backend layer verification**: Added a dedicated CI check that validates the layer manifest, lockfile, and installed dependencies before synth or deploy
- **Environment-based log retention**: Default Lambda log retention now varies by environment (dev=1 day, staging=7 days, prod=30 days)
- **Recursive loop termination**: Optional recursive loop detection support is now available through the shared Lambda factory

#### Backend

- **Concurrency utilities**: Added shared helpers for bounded async batch processing in the lifecycle stream handler
- **Retry backoff coverage**: Added focused tests for persistence retry backoff behavior

### Changed

#### Infrastructure

- CI, deploy, and deploy-validation workflows now build and verify the backend layer before synth or deploy
- `ProjectResourceFactory.createNodejsFunction` now accepts `projectEnv`, supports Lambda layers, and externalizes layer-managed dependencies only when a layer is attached
- Salah, Sawm, and User business Lambdas now attach the shared dependency layer
- Reset lifecycle jobs now keep the read permissions they need on prayer and fast log tables
- User lifecycle stream processing now uses larger batches, a short batching window, record-age limits, and INSERT-only filtering

#### Backend

- **Lazy DI reuse**: Repository and use-case containers now lazily initialize shared instances and reuse them across warm invocations instead of constructing everything eagerly
- **Handler wiring**: Lambda handlers now resolve use cases through getter-based DI functions
- **AWS client reuse**: AWS SDK clients now share one keep-alive HTTPS agent and `NodeHttpHandler` per runtime instance
- **Lifecycle stream execution**: The lifecycle job handler now processes eligible records concurrently within a batch while keeping failures visible for retry

### Fixed

#### Tooling

- Frontend pages-artifacts tests now call the generator directly instead of spawning `node`, which removes sandbox-related test failures
- Backend E2E seed route tests now verify route registration without binding network sockets
- Root ESLint now ignores `docs/private/**`, preventing internal notes from breaking repo lint runs

---

## v1.3.0

### Changed

#### Frontend

- **New hooks for rate limiting UX**: `useResetCooldown` tracks 10-minute cooldown with live countdown; `useHasLogsCache` inspects React Query cache; both update reactively without page refresh
- **Rate limiting applied to export**: Download My Data button now shows countdown timer and enforces 10-minute cooldown
- Reset buttons now show countdown timer (e.g., "Clear All Prayer Logs (9m 32s)") and are disabled when cooling down or when no logs exist
- **Export filename improved**: Now includes username/email prefix: `awdah-data-export-{username}-{date}.json`

#### Backend

- **Rate limiting**: `ResetPrayerLogsUseCase` and `ResetFastLogsUseCase` now enforce 10-minute cooldown between same-type resets; throws `RateLimitError` (429) if violated
- **Records existence check**: Use cases throw `ConflictError` (409) if user attempts reset with no logs

### Added

#### Frontend

- **`useResetCooldown` hook**: Secure localStorage cache with base64 obfuscation; tracks last reset timestamp per action type with live countdown
- **`useHasLogsCache` hook**: Inspects React Query cache for history queries to detect log existence without backend roundtrip
- **`secureStorage` utility**: Obfuscated localStorage wrapper with timestamp validation and auto-expiration
- **Same-tab sync**: Custom `cooldown-recorded` event broadcasts cooldown updates within same tab for immediate UI refresh

#### Backend

- **`RateLimitError`**: New error class in shared package; returns HTTP 429 status code
- **`findRecentJobByType()`**: Repository method queries lifecycle jobs table by user + type + timestamp for rate limiting enforcement
- **`hasAnyLogs()`**: Repository method on prayer/fast logs; efficient `Limit: 1` query to check log existence

### Fixed

#### Frontend

- **Layout fixed**: Confirmation dialog now takes full width with proper vertical stacking (`resetItemWithConfirm` CSS class)
- **Click-outside handler**: Confirmation dialogs now close when clicking outside the action area
- **New i18n keys added**: `settings.export_rate_limited` (EN/DE/AR)
- **i18n wording improved**: Better descriptions for reset hints explaining debt recalculation (EN/DE)
- **Toast suppression fixed**: Rate limiting and no-records toasts now suppressed in all languages using translation key matching instead of hardcoded strings

### Refactored

#### Frontend

- **`DataManagementSection` modularized**: Extracted `ActionCard` component, `getActionConfig` helper with DRY configuration pattern, and `error-messages` helper with pattern-based matching
- **Removed useless comments**: Cleaned up redundant comments in `use-has-logs-cache.ts`, `action-config.ts`, `settings.spec.ts`, `data-management-section.tsx`, and use case files

#### Backend

- **Rate limiting DRY**: Extracted `RATE_LIMIT_MINUTES` constant and `getRateLimitSince()` helper to `@awdah/shared` package; updated `ExportDataUseCase`, `ResetPrayerLogsUseCase`, and `ResetFastLogsUseCase` to use shared implementation instead of duplicated logic

## v1.2.0

### Changed

#### Frontend

- Settings now separates privacy information from action handling and introduces a dedicated Data Management section for the shared lifecycle actions: download data, clear prayer logs, and clear fast logs
- The delete-account flow stays isolated in the Danger Zone, with clearer wording that it uses the same background lifecycle workflow and signs the user out only after cleanup finishes
- Export and reset actions now use one consistent confirmation pattern with re-auth, in-progress labels, and inline workflow errors instead of three slightly different settings experiences

#### Backend

- User lifecycle job types and statuses now use typed constant objects (`UserLifecycleJobType`, `UserLifecycleJobStatus`) with type guards (`isExportJob`, `isDeleteAccountJob`, etc.) instead of raw string comparisons
- `ProcessUserLifecycleJobUseCase` refactored to use a handler registry pattern with `Record<>` lookup, replacing the previous switch statement with type-safe dispatch
- Hardcoded strings extracted to constants: `EXPORT_CONTENT_TYPE` and `DEFAULT_ERROR_MESSAGE`
- Related use cases (`delete-account`, `download-export-data`, `finalize-delete-account`) updated to use new enum constants and type guards

### Fixed

#### Frontend

- Reset-workflow start failures now resolve to translated message keys instead of falling back to hard-coded English strings
- Settings now surfaces background-job expectations more clearly for the four lifecycle actions described in the shared workflow documentation

## v1.1.3

### Changed

#### Backend

- Dependency injection use-cases are now organized by context (`salah-use-cases.ts`, `sawm-use-cases.ts`, `user-use-cases.ts`) instead of one monolithic file
- Handler imports updated to pull from context-specific DI modules rather than the shared container
- `wrap-handler.ts` middleware refactored into smaller focused functions for request building, invocation metadata extraction, and error handling
- `create-handler.ts` now constructs request-scoped loggers with path and method context for better traceability
- `DynamoDBUserDataLifecycleService` now delegates query operations through the base repository method instead of constructing raw `QueryCommand` instances inline
- DynamoDB repository methods now consistently return typed results with `lastEvaluatedKey` instead of raw AWS SDK response shapes
- Domain entities now use strongly-typed value objects (`UserId`, `EventId`, `PeriodId`) instead of raw string identifiers; persistence layer uses dedicated mappers for conversion
- Added shared `responses` utility in `responses.ts` for standardized HTTP response shaping across handlers and tests

### Fixed

#### Backend

- Prayer log persistence now mirrors other repositories by omitting key attributes from the payload during saves
- User lifecycle export queries only pass required expression attribute names to avoid DynamoDB validation errors
- Missing or partial user settings now return a 404 instead of a 500 during profile fetch
- Shared effective-start-date helper keeps Salah/Sawm debt use cases DRY without coupling contexts
- Shared practicing-period rules keep add/update use cases aligned on DOB and revert-date validation
- Environment validation no longer falls back to computed defaults outside local mode
- Qadaa logging now rejects over-completion server-side when no debt remains for a prayer
- Allowed future `bulughDate` values in user settings validation to accommodate predictive obligation planning
- Practicing periods now enforce the `revertDate` starting boundary and allow voluntary overlaps as UI warnings

#### Frontend

- Prevent profile fetch errors from crashing the client when the server response omits an `error` payload
- Allow future bulugh dates during onboarding so users can record a future obligation date without validation errors
- Qadaa completion UI now waits for debt data before showing “all caught up” states or disabling prayer counters
- Account deletion now distinguishes password-verification failures from downstream lifecycle failures and signs the user out cleanly after successful deletion
- Enhanced `auth-errors.ts` to detect network/DNS failures and provide specific connection feedback in three languages
- Integrated debt-aware UX in `PrayerLogger` to disable qadaa logging actions when no debt remains

#### Shared

- `StringValueObject.equals` now guards nullish inputs to preserve base-class contract

#### Persistence

- Full-jitter backoff now matches the documented retry strategy
- Check-in prompt messages updated across English, Arabic, and German for improved clarity and user experience
- New pages artifacts generator script pre-builds public route metadata and HTML entry point for consistent static hosting

#### Infrastructure

-- Alarm stack no longer imports per-Lambda function references from the API stack, which unblocks CloudFormation rollback by keeping only aggregate alarms and dashboard widgets that do not depend on Lambda exports

- `FrontendStack` now deploys after `ApiStack` in CDK ordering to keep hosting paths aligned with the published API environment
- Removed unused `appEnv` context fallback from config resolution
- `AlarmStack` dependency graph updated: now depends on `BackupStack` directly since it monitors backup resources
- `ProcessUserLifecycleJobFn` Lambda permissions were corrected so lifecycle delete/reset jobs retain the write access they need on the managed user-data tables
- Lambda environment variables consolidated into `baseEnv` in constructs to reduce duplication; environment variable handling now only allows computed fallbacks in local mode and fails fast elsewhere
- Standardized infrastructure naming on CDK context (`ticket` prefix) across all project stacks (Data, Auth, API, Backup, Alarms, Frontend)
- Consolidated resource naming logic into `naming.ts` and refactored `BaseStack` to consume it directly
- Refactored `app.ts` entry point to use a typed deployment configuration and centralized tagging logic in `config.ts`
- Added `docs/private/naming-architecture.md` documentation covering the infrastructure naming philosophy

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
