# Scripts

Helper scripts for deploy, local dev, and maintenance. All scripts are run from the repo root.

---

## Deploy

### `deploy.sh`

Full deploy or targeted partial deploy with an interactive mode selector.

```bash
./scripts/deploy.sh                # interactive prompt
./scripts/deploy.sh --quick        # hotswap + parallel (fastest, Lambda changes only)
./scripts/deploy.sh --hotswap      # near-instant Lambda update without hotswap+parallel
./scripts/deploy.sh --skip-build   # skip shared package build (use if already built)
./scripts/deploy.sh --skip-bootstrap  # skip CDK bootstrap (use after first deploy)
```

Interactive mode offers four options: Full, Quick, Hotswap Only, and Skip Setup.

Reads `DEPLOY_ENV` (default: `dev`) and `AWS_DEFAULT_REGION` (default: `eu-west-1`) from `.env` if present.

### `deploy-all.sh`

Deploys all CDK stacks and the frontend in a single command. Builds the shared package, synths all stacks, deploys from data → alarm in order, then builds and deploys the frontend S3/CloudFront stack.

```bash
DEPLOY_ENV=prod ./scripts/deploy-all.sh
```

### `deploy-stack.sh`

Deploys a single named CDK stack. Accepts the stack name as first argument or prompts interactively.

```bash
./scripts/deploy-stack.sh data       # deploy DataStack
./scripts/deploy-stack.sh api        # deploy ApiStack
./scripts/deploy-stack.sh frontend   # deploy FrontendStack
```

Valid stack names: `data`, `auth`, `api`, `backup`, `alarm`, `frontend`.

### `deploy-frontend.sh`

Builds the React app and deploys to CloudFront/S3. Use after frontend-only changes to avoid running the full backend deploy pipeline.

---

## Destroy

### `destroy.sh`

Destroys all CDK stacks for the target environment in reverse dependency order (frontend → alarm → backup → api → auth → data). Stacks that are not found are skipped silently.

```bash
DEPLOY_ENV=dev ./scripts/destroy.sh
```

### `destroy-stack.sh`

Destroys a single named CDK stack. Interactive or accepts stack name as argument.

```bash
./scripts/destroy-stack.sh api
```

---

## Configuration

### `generate-frontend-config.sh`

Reads CDK outputs from `infra/outputs.json` (produced by a deploy) and writes the frontend `.env.production` file. Run this after any deploy that changes API URLs or Cognito config.

```bash
DEPLOY_ENV=staging ./scripts/generate-frontend-config.sh
```

Updates `VITE_API_BASE_URL`, `VITE_COGNITO_USER_POOL_ID`, and `VITE_COGNITO_CLIENT_ID` if the relevant stacks were part of the last deploy. Existing values are preserved if the stack was not redeployed.

### `check-aws-session.sh`

Checks whether the current shell has valid AWS credentials via `aws sts get-caller-identity`. Exits non-zero if the session is expired. Called automatically by all deploy scripts before doing any AWS work.

```bash
./scripts/check-aws-session.sh
```

---

## Local dev

### `reset-prayers.sh`

Deletes all prayer log entries from the local DynamoDB (LocalStack). Useful during development to reset prayer history without touching the user profile.

```bash
./scripts/reset-prayers.sh             # delete all prayer logs
./scripts/reset-prayers.sh <user-id>   # delete logs for one user only
```

Requires Docker running with LocalStack. Targets the `prayer-logs-dev` table on `http://localhost:4566`.

### `reset-fasts.sh`

Same as `reset-prayers.sh` but for fast log entries. Targets the `fast-logs-dev` table.

```bash
./scripts/reset-fasts.sh
./scripts/reset-fasts.sh <user-id>
```

---

## Pre-push checks

### `pre-push-checks.sh`

Mirrors the CI pipeline exactly. Run this before pushing to catch failures locally. Independent steps run in parallel to reduce wall-clock time.

```bash
./scripts/pre-push-checks.sh                    # all checks
SKIP_TESTS=1 ./scripts/pre-push-checks.sh       # skip tests
SKIP_BUILDS=1 ./scripts/pre-push-checks.sh      # lint/typecheck/test only
```

### `pre-push-quick.sh`

Lightweight gate: lint and typecheck only. Runs in roughly 15–20 seconds. Tests and builds are skipped.

```bash
./scripts/pre-push-quick.sh
```

---

## Load testing

### `load-burst-smoke.mjs`

Cost-aware burst load tester. Defaults are intentionally small to avoid running an expensive or abusive test unintentionally.

```bash
npm run load:burst
```

All options are set via environment variables:

| Variable                   | Default                 | Description                           |
| -------------------------- | ----------------------- | ------------------------------------- |
| `LOAD_TEST_BASE_URL`       | `http://localhost:3000` | Base URL of the target server         |
| `LOAD_TEST_PATH`           | `/health`               | Request path                          |
| `LOAD_TEST_METHOD`         | `GET`                   | HTTP method                           |
| `LOAD_TEST_CONCURRENCY`    | `5`                     | Parallel requests per burst           |
| `LOAD_TEST_REQUESTS`       | `25`                    | Total requests across the whole run   |
| `LOAD_TEST_BURSTS`         | `3`                     | Number of bursts                      |
| `LOAD_TEST_BURST_PAUSE_MS` | `1000`                  | Pause between bursts in milliseconds  |
| `LOAD_TEST_JWT`            | —                       | Bearer token for authenticated routes |
| `LOAD_TEST_BODY`           | —                       | JSON string body for POST/PUT/DELETE  |

Outputs p50 and p95 latency, status code breakdown, and network failure count. Exits with code 1 if any server errors or network failures occurred.

---

## Version management

### `pin-latest-versions.mjs`

Rewrites all `package.json` files in the monorepo to pin dependencies at their latest released version (no `^` or `~`). Run before committing dependency updates to satisfy the pinned-versions rule.

```bash
node scripts/pin-latest-versions.mjs
```

### `verify-pinned-versions.mjs`

Checks that all dependencies across the monorepo are pinned (no `^` or `~` prefixes). Used in the pre-push check and CI.

```bash
node scripts/verify-pinned-versions.mjs
```

Exits non-zero if any unpinned versions are found and lists the affected packages.
