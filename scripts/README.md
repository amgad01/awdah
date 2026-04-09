# Scripts

Helper scripts organized into topic folders. All scripts are run from the repo root.

```
scripts/
  deploy/   # Deployment, build, and infrastructure management scripts
  ci/       # CI checks, pre-push gates, and build verification
  dev/      # Local development utilities
  test/     # Load testing and version management
  release/  # Release tooling
  lib/      # Shared shell functions (sourced by other scripts)
```

---

## deploy/

### `deploy.sh`

Full deploy or targeted partial deploy with an interactive mode selector.

```bash
./scripts/deploy/deploy.sh                # interactive prompt
./scripts/deploy/deploy.sh --quick        # hotswap + parallel (fastest, Lambda changes only)
./scripts/deploy/deploy.sh --hotswap      # near-instant Lambda update without hotswap+parallel
./scripts/deploy/deploy.sh --skip-build   # skip shared package build (use if already built)
./scripts/deploy/deploy.sh --skip-bootstrap  # skip CDK bootstrap (use after first deploy)
./scripts/deploy/deploy.sh --skip-alarm-stack  # deploy all stacks except alarm stack
```

**NPM shortcuts:** `npm run deploy:dev`, `npm run deploy:quick`, `npm run deploy:skip-alarm:dev`

### `deploy-all.sh`

Deploys the backend stacks and then runs the environment-aware frontend flow.

```bash
DEPLOY_ENV=prod ./scripts/deploy/deploy-all.sh
```

### `deploy-stack.sh`

Deploys a single named CDK stack.

```bash
./scripts/deploy/deploy-stack.sh data
./scripts/deploy/deploy-stack.sh api
```

### `deploy-localstack.sh`

Deploys CDK stacks to LocalStack for local development.

```bash
./scripts/deploy/deploy-localstack.sh data
./scripts/deploy/deploy-localstack.sh auth
./scripts/deploy/deploy-localstack.sh api
```

### `deploy-frontend.sh`

Builds the React app and runs the correct hosting flow for the selected environment.

### `build-frontend.sh`

Builds the frontend bundle without deploying it.

```bash
./scripts/deploy/build-frontend.sh dev    # CloudFront build
./scripts/deploy/build-frontend.sh prod   # GitHub Pages build
```

### `destroy.sh` / `destroy-stack.sh`

Destroy all stacks or a single named stack.

```bash
DEPLOY_ENV=dev ./scripts/deploy/destroy.sh
./scripts/deploy/destroy-stack.sh api
```

### `generate-frontend-config.sh`

Reads CDK outputs and writes the frontend `.env.production` file.

### `check-aws-session.sh`

Validates AWS credentials before any deploy operation.

### `list-outputs.sh`

Lists CDK stack outputs for an environment.

```bash
./scripts/deploy/list-outputs.sh dev
```

### `smoke-test-pages.sh`

Validates a deployed GitHub Pages site.

```bash
./scripts/deploy/smoke-test-pages.sh https://amgad01.github.io/awdah/
```

---

## ci/

### `pre-push-checks.sh`

Mirrors the CI pipeline. The Husky pre-push hook runs this automatically.

```bash
./scripts/ci/pre-push-checks.sh
RUN_E2E=1 ./scripts/ci/pre-push-checks.sh   # include Playwright E2E
SKIP_TESTS=1 ./scripts/ci/pre-push-checks.sh
```

### `pre-push-quick.sh`

Lightweight gate: lint and typecheck only (~15–20 seconds).

```bash
./scripts/ci/pre-push-quick.sh
```

### `check-pages-build.sh`

Builds the frontend with the GitHub Pages base path and verifies the output.

```bash
npm run check:pages
```

### `verify-pages-dist.sh`

Verifies a built Pages dist directory is correctly structured.

### `patch-bundled-cdk-deps.sh`

Patches bundled CDK dependency versions. Run automatically via `npm install` (`postinstall`).

---

## dev/

### `reset-prayers.sh`

Deletes all prayer log entries from local DynamoDB (LocalStack).

```bash
./scripts/dev/reset-prayers.sh
./scripts/dev/reset-prayers.sh <user-id>
```

### `reset-fasts.sh`

Same as `reset-prayers.sh` but for fast logs.

### `run-e2e-backend-dev.sh`

Runs the backend dev server for E2E testing.

### `setup-hybrid-dev.sh`

Sets up the hybrid dev environment (local frontend + cloud backend).

---

## test/

### `load-burst-smoke.mjs`

Cost-aware burst load tester. Defaults are intentionally small.

```bash
npm run load:burst
# or
LOAD_TEST_BASE_URL=http://localhost:3000 node scripts/test/load-burst-smoke.mjs
```

### `pin-latest-versions.mjs`

Rewrites all `package.json` files to pin dependencies at their latest released version.

```bash
node scripts/test/pin-latest-versions.mjs
```

### `verify-pinned-versions.mjs`

Checks that all dependencies are pinned (no `^` or `~` prefixes).

```bash
node scripts/test/verify-pinned-versions.mjs
```

### `verify-inline-script-csp.mjs`

Verifies non-script CSP compliance in the built frontend.

---

## lib/

Shared shell functions sourced by deploy and CI scripts. Not meant to be run directly.

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

Exits non-zero if any unpinned versions are found and lists the affected packages.
