# Contributing to Awdah

Awdah is a public source-available repository. Contributions are welcome: code, translations, scholarly review, or catching a bug. All collaboration remains subject to the repository license.

For areas where help is most needed and the v2 roadmap, see the [/contribute](https://amgad01.github.io/awdah/contribute) page in the app. It covers what areas need work, how to submit a PR, and what is planned next.

---

## Before You Start

If this is your first contribution, choose the lightest lane that fits your change:

- Content, docs, translations, and public-page copy: frontend-only is usually enough
- Dashboard, tracker, settings, auth, or API work: use the full local app setup
- Deploy, routing, `index.html`, or GitHub Pages changes: also run the Pages build check

You do not need a real AWS account for normal contribution work.

## Local development

### Prerequisites

- Node.js (version in `.nvmrc`)
- Docker (for LocalStack — mode 2 only)
- AWS CLI (optional, for direct LocalStack inspection)

You do not need a real AWS account for normal contribution work.

### Setup

### 1. Cloudless path (no Docker, no AWS)

Use this for UI, translations, public-page content, and any work that doesn't need real auth or database calls. The frontend runs entirely with a built-in in-memory auth backend — no LocalStack needed.

```bash
# Clone and install
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install

# Enable local auth mode and start the frontend
npm run dev:local      # writes VITE_AUTH_MODE=local to .env.local
npm run dev:frontend   # http://localhost:5173
```

You can sign up / log in with any email and password in local auth mode. Data is stored in memory until the tab is closed. The `/demo`, `/about`, `/learn`, and `/contribute` routes work without login.

### 2. Frontend-only path

Use this for:

- `README.md`, `CONTRIBUTING.md`, and docs
- translation files under `apps/frontend/src/i18n/`
- static page content under `apps/frontend/public/data/`
- UI work on public routes such as `/learn`, `/about`, `/contribute`, and `/demo`

```bash
# Clone and install
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install

# Start the frontend
npm run dev:frontend
```

### 3. Full local app path

Use this when your change needs login, tracker data, settings, API routes, or LocalStack-backed behavior.

```bash
# Clone and install
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install

# Start LocalStack (simulates DynamoDB, S3, SQS, Cognito, etc.)
docker compose up -d localstack

# Deploy infrastructure to LocalStack (data tables, auth, API)
./scripts/deploy-localstack.sh data
./scripts/deploy-localstack.sh auth
./scripts/deploy-localstack.sh api

# Start the dev servers in separate terminals
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # Lambda runner on http://localhost:3000
```

Copy `.env.example` to `.env.local` — LocalStack doesn't need real credentials:

```bash
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=eu-west-1
LOCALSTACK_ENDPOINT=http://localhost:4566
```

### Running checks

```bash
npm run check:quick   # Fast repo gate: shared build + lint + format check + typecheck
npm run check         # Full repo gate: builds, tests, and audit
npm run check:pages   # Builds the frontend with /awdah/ and verifies the Pages output
```

The Husky pre-push hook runs the full gate plus frontend Playwright E2E, so LocalStack must be running before you push. If you want the faster path while iterating, use `npm run check:quick`.

Pre-commit hooks run lint and a quick typecheck automatically.

---

## How to submit a PR

1. Fork `amgad01/awdah` on GitHub and clone your fork
2. Create a branch: `git checkout -b feat/your-change` (use `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, or `infra/`)
3. Make your changes — see the code standards section below
4. Run `npm run check:quick` and fix any failures
5. Commit using Conventional Commits: `git commit -m "feat: add French translation"`
6. Push and open a PR against `main`
7. CI runs automatically — the PR needs to be green before merge

For religious content changes, include the scholarly source in your commit message or PR description.

---

## Deployment environments

Awdah supports three deployment targets. All three share the same codebase; environment-specific behaviour is controlled by environment variables and build flags.

| Environment           | Frontend                                | Backend                                 | Data layer                             |
| --------------------- | --------------------------------------- | --------------------------------------- | -------------------------------------- |
| **Cloudless local**   | Vite dev server (`localhost:5173`)      | In-memory mock auth (no backend needed) | In-memory only (no persistence)        |
| **Local dev**         | Vite dev server (`localhost:5173`)      | Express runner (`localhost:3000`)       | LocalStack DynamoDB (`localhost:4566`) |
| **AWS (dev/staging)** | CloudFront + S3 via CDK `FrontendStack` | Lambda + API Gateway via CDK `ApiStack` | DynamoDB (on-demand)                   |
| **Production**        | GitHub Pages (`/awdah/` base path)      | Lambda + API Gateway (prod CDK deploy)  | DynamoDB (prod, deletion-protected)    |

### Cloudless local (no Docker, no AWS)

```bash
npm run dev:local      # sets VITE_AUTH_MODE=local in .env.local (run once)
npm run dev:frontend   # localhost:5173 – no backend required
```

### Local development

```bash
docker compose up -d localstack   # DynamoDB, S3, SQS, Cognito mock
npm run dev:frontend              # localhost:5173
npm run dev:backend               # localhost:3000
```

### AWS (dev/staging)

```bash
./scripts/check-aws-session.sh    # Validate AWS credentials
./scripts/deploy-all.sh           # CDK deploy: data → auth → api → backup → alarm → frontend
```

### Production (GitHub Pages + AWS backend)

Production deploys happen through GitHub Actions:

1. **CI** (`ci.yml`) — lint, typecheck, build, test, and audit on every push; on `release/vX.Y.Z-*` pushes it also runs the full automatic release lane inside the same workflow run
2. **Deploy Validation** (`deploy-validation.yml`) — PR-only dry run against `main`; proves the deploy path without publishing and does not need AWS credentials
3. **Manual E2E** (`e2e.yml`) — Docker-based Playwright tests you can run manually against the selected ref/SHA
4. **Manual Deploy Backend** (`deploy.yml`) — resolve the exact source SHA plus release tag, surface both in the approval gate, deploy to prod, and smoke test `/health`
5. **Manual Deploy Frontend** (`deploy-pages.yml`) — reuse that same source SHA, create or verify the release tag on that commit, build for Pages, publish the GitHub release, and smoke test the live site

`main` is validation only. Production publishing happens from a release branch or an explicit tagged release, not from an ordinary merge to `main`.

### Release versioning

Release tags follow `vX.Y.Z` format. Branch names matching `release/vX.Y.Z-*` are the source of truth for automated production releases. The automatic release lane now stays inside `ci.yml`, so the same workflow run carries the exact pushed commit through quality checks, release preparation, E2E, backend deploy, and Pages deploy without spawning separate child workflow runs.

When you run `deploy.yml` or `deploy-pages.yml` manually from a release branch:

- leave `release_tag` blank and set `confirm_branch_release_tag=true` if you want to use the branch-derived version
- provide `release_tag` if you want to override the branch-derived version

The workflow resolves the version in this order:

1. Manual `release_tag` input, if you provide one
2. The selected branch name if it matches `release/vX.Y.Z-*`
3. An existing semver tag already attached to the exact source commit
4. Otherwise fail closed

If none of those are available, the workflow fails instead of guessing. This is intentional: it prevents a production release from silently drifting onto an older tag lineage.

GitHub Actions cannot dynamically prefill the environment approval dialog with a computed suggestion. Instead, the workflow computes the release version before the protected deploy job starts and shows it in the run summary and deploy job name.

Deploy validation is only for pull requests into `main`. It is not part of the production publish chain, and it avoids live AWS access by using local build inputs.

---

## Code standards

- No `console.log` - use the structured logger in the backend
- No hardcoded display strings in components - all copy goes through the translation layer (`t('key')`)
- No directional CSS properties (`margin-left`, `padding-right`) - use logical properties only (`margin-inline-start`, `padding-inline-end`)
- No raw `any` types
- All API route changes must be reflected in `docs/api/openapi.yaml`
- All dates are Hijri `YYYY-MM-DD` - Gregorian conversion only at the API boundary
- The public auth flow supports `?auth=login`, `?auth=signup`, and `?auth=forgot` as an initial view hint for the unauthenticated shell; treat it as a startup contract, not persistent routing state

### API calls

All API calls go through `apps/frontend/src/lib/api.ts`, which delegates to the `ApiClient` class in `apps/frontend/src/lib/api-client.ts`. The `ApiClient` provides:

- **Request/response interceptors** — add auth headers, logging, etc.
- **Automatic retry** with exponential backoff + jitter for 5xx, 408, 429, and network errors
- **Debug logging** in development mode

To add a new API endpoint, add a function to the appropriate namespace in `api.ts` (e.g. `api.salah`, `api.sawm`, `api.user`). The function calls `request<T>()` which uses the singleton `ApiClient` instance.

### Query cache invalidation

All React Query cache invalidations use the centralized helpers in `apps/frontend/src/utils/query-invalidation.ts`. Every `invalidateQueries` call must include an explicit `exact: true` or `exact: false` flag:

```typescript
import { invalidateSalahQueries } from '@/utils/query-invalidation';

// In a mutation's onSuccess:
invalidateSalahQueries(queryClient, variables.date);
```

Available helpers: `invalidateSalahQueries`, `invalidateSawmQueries`, `invalidateUserProfile`, `invalidatePracticingPeriods`, `invalidateAllWorshipQueries`.

### Responsive menu

The `useResponsiveMenu` hook (`apps/frontend/src/hooks/use-responsive-menu.ts`) provides mobile burger menu state for both the authenticated nav and the public page shell. It handles toggle, close, click-outside dismissal, and Escape key.

---

## Validation pipeline

### Pre-push checks

The Husky pre-push hook runs the full gate:

```bash
# Full gate (run automatically on git push):
npm run check          # shared build → lint → format → typecheck → build → test → audit

# Quick gate (for fast iteration):
npm run check:quick    # shared build → lint → format → typecheck only

# Pages-specific build verification:
npm run check:pages    # Builds frontend with /awdah/ base path and verifies output
```

### CI pipeline (GitHub Actions)

Every push and PR triggers `ci.yml`:

1. Build shared package
2. ESLint (root + frontend configs)
3. Prettier format check
4. TypeScript (all workspaces)
5. Build all apps
6. Check Pages build output
7. Build CDK infra
8. Run all unit tests (vitest)
9. Security audit (high severity)

On ordinary branches, CI stops there. On `release/**` pushes, the same `ci.yml` run continues through `Prepare Release Context -> E2E -> Approve Backend -> Deploy Backend -> Approve Pages -> Deploy Pages`. The standalone `e2e.yml`, `deploy.yml`, and `deploy-pages.yml` workflows are reserved for manual debugging or controlled reruns.

### Running tests locally

```bash
npm run test                         # All vitest unit tests (workspace)
npm run test --workspace=apps/frontend   # Frontend unit tests only
npm run test --workspace=apps/backend    # Backend unit tests only
npm run test --workspace=packages/shared # Shared package tests only

# E2E (requires LocalStack + backend running):
npx playwright test --config=apps/frontend/playwright.config.ts

# Smoke test (cost-aware burst load):
LOAD_TEST_BASE_URL=http://localhost:3000 node scripts/load-burst-smoke.mjs

# Backend resilience verification:
npx tsx apps/backend/scripts/verify-resilience.ts
```

---

## Updating content without code changes

Most of the app's public-facing content lives in JSON files under `apps/frontend/public/data/`. These files are fetched at runtime, so you can update them by editing the JSON, committing, and letting the deploy pipeline run — no TypeScript changes needed.

For current work areas, roadmap items, and the contributor-facing project board, use the hosted [/contribute](https://amgad01.github.io/awdah/contribute) page. This file stays focused on contribution workflow and repo mechanics.

### Add a contributor to the About page

Edit `apps/frontend/public/data/about-en.json` and `about-ar.json`. Add an entry to the `contributors` array at the end of each file:

```json
{
  "id": "github-username",
  "name": "Your Name",
  "github": "github-username",
  "role": "Frontend",
  "contribution_summary": "What you contributed — one sentence is enough"
}
```

Commit the two files and open a PR. Once merged and deployed, your entry appears on the About page.

### Update the FAQ

Edit `apps/frontend/public/data/faq-en.json`, `faq-ar.json`, and `faq-de.json`. Each entry in the `items` array has an `id`, `question`, `answer`, and optional `references` array. Add to the relevant section or add a new section if needed. The FAQ page fetches the file fresh on each load, so there is no cache to clear.

### Update the Contributing page sections

The Contributing page content (areas of work, PR guide, v2 roadmap) lives in `apps/frontend/public/data/contributing-en.json`, `contributing-ar.json`, and `contributing-de.json`. Edit the text directly – sections, items, and steps are all plain strings. No component changes are needed.

### Add a new UI language

Adding a new language to the app requires adding a translation file to the frontend codebase and rebuilding the app to bundle it.

Important boundary:

- Only files in `apps/frontend/src/i18n/` use the `_meta` key.
- Files in `apps/frontend/public/data/` do not use `_meta` and should keep their existing content-only schema.
- The built-in translation bundles are `en.json`, `ar.json` and `de.json`.

#### 1. i18n translation bundle

Each language is a single JSON file. The file is self-describing — the language switcher discovers it automatically at build time, so no registration step is needed.

1. Copy `apps/frontend/src/i18n/en.json` and name it with the ISO 639-1 code (e.g. `fr.json` for French, `tr.json` for Turkish, `ur.json` for Urdu)
2. Translate all string values — do not change keys, and keep `{{variable}}` placeholders exactly as they are
3. At the end of the file, add a `_meta` block:
   ```json
   "_meta": {
     "code": "fr",
     "name": "French",
     "nativeName": "Français",
     "shortLabel": "FR",
     "dir": "ltr"
   }
   ```
   For a right-to-left language like Urdu, use `"dir": "rtl"`.

#### 2. Public data files

The About, FAQ, and Contributing pages load their content from `apps/frontend/public/data/`. These files are independent of the i18n system and need to be translated separately.

1. Copy each `*-en.json` file to a `*-<code>.json` variant and translate all string values:

- `apps/frontend/public/data/about-en.json` → `apps/frontend/public/data/about-fr.json`
- `apps/frontend/public/data/contributing-en.json` → `apps/frontend/public/data/contributing-fr.json`
- `apps/frontend/public/data/faq-en.json` → `apps/frontend/public/data/faq-fr.json`
- Keep the same content-only schema. Do not add `_meta` to these files.

2. If a language is only partially translated, the UI falls back to English for missing public content.

#### 3. Glossary terms, references, and tooltips

The glossary in `apps/frontend/src/content/glossary/glossary.json` powers the term tooltips used in onboarding and other educational copy. It is separate from the translation bundles, but it still needs language-specific text if you want the terms to read naturally in a new language.

1. Review the glossary terms that appear in translated screens, especially onboarding and qadaa guidance copy.
2. Add your language code to any glossary entry that should have native synonyms, definitions, or source references.
3. If you introduce new scholarly links, add them under `apps/frontend/src/content/references/` and render them through the reference list component.
4. Verify the tooltip copy in the app in both LTR and RTL if applicable.

Glossary entries fall back to English when a language key is missing, so adding the new language is optional for basic functionality but required for a fully polished rollout.

#### 4. Full language support checklist

To ship a new language end-to-end, add all of the following:

- `apps/frontend/src/i18n/<code>.json` with the translated UI copy and a valid `_meta` block
- `apps/frontend/public/data/about-<code>.json`
- `apps/frontend/public/data/contributing-<code>.json`
- `apps/frontend/public/data/faq-<code>.json`
- `apps/frontend/src/content/glossary/glossary.json` entries for any terms that should have native tooltip text or references
- `apps/frontend/src/content/references/` entries for any new scholarly sources you want to surface in the UI
- `apps/frontend/public/demo-data/sample-user.json` with `user.story.<code>` for the demo route

If the language is right-to-left, set `_meta.dir` to `rtl` and verify the UI in both LTR and RTL contexts.

#### 5. Verify and rebuild

1. Run `npm run dev:frontend` — the language switcher will show your new language immediately in dev mode
2. Go through the app in your new language and check for anything that looks wrong in context
3. Run `npm run test --workspace=apps/frontend` and `npm run check:quick`
4. Rebuild and redeploy the frontend for the new language to be available in production

RTL layout switches automatically based on the `dir` value in `_meta` — no component changes are needed.

---

## Semantic versioning

Awdah follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

| Version type      | When to use                                                                                  | Example change                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Patch** `x.x.Z` | Backwards-compatible bug fixes only. No new features, no API changes.                        | Fix off-by-one Hijri date; fix missing translation key; correct deploy script variable                |
| **Minor** `x.Y.0` | New backwards-compatible functionality added. Existing API contracts remain intact.          | Add German language support; add export feature; add responsive burger menu                           |
| **Major** `X.0.0` | Backwards-incompatible (breaking) changes. Users or integrators must take action to upgrade. | Remove an API endpoint; change DynamoDB table schema incompatibly; drop support for a browser/runtime |

### Practical examples

```
v1.0.0 → v1.0.1   Fix: prayer logger crash when debt is zero
v1.0.1 → v1.1.0   Feat: add history page and German language support
v1.1.0 → v2.0.0   Breaking: replace Cognito with a new auth provider (token format changes)
```

### Branch naming

Feature work targeting a release uses a `release/vX.Y.Z` branch prefix. The deploy pipeline parses the semantic version from that prefix and ignores the descriptive suffix:

```
release/v1.1.0         Minor release branch
release/v1.1.0-auth-security-api-hardening   Descriptive release branch
release/v1.1.0-beta1   Pre-release variant of the same version
```

Regular feature branches do not need the `release/` prefix; they merge into `main` and stay in the validation lane until an explicit release branch is cut.

### CHANGELOG

Every PR should update `CHANGELOG.md`, keeping the `[Unreleased]` section at the top. Follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`.

---

## Contributor recognition

Everyone with a merged PR is listed in the README and on the About page with their name, GitHub profile, and a description of what they contributed. Translation contributors and scholar reviewers are credited by name and role.

After your PR is merged, open a second small PR updating `apps/frontend/public/data/about-en.json` and `about-ar.json` to add yourself to the contributors array (see the section above). If you'd prefer not to update it yourself, a maintainer can do it for you — just ask.

---

If you have questions, reach out on [LinkedIn](https://www.linkedin.com/in/amgad-m) or open an issue on GitHub.
