# GitHub Actions Architecture Guide

## Part 1: Technical Reference

### Overview

This repository uses GitHub Actions for continuous integration, deployment, and release management. The architecture follows a pipeline pattern where workflows trigger other workflows, creating an automated flow from code push to production deployment.

---

## Workflow Files

### 1. `ci.yml` - Continuous Integration

**Purpose**: Validates every code change through quality gates before it can proceed further.

**Triggers**:

- `push` - Every push to any branch
- `workflow_dispatch` - Manual trigger for debugging

**What it does**:
Runs a comprehensive quality check job that executes linting, type checking, builds, and tests across all workspaces. It checks ESLint rules, Prettier formatting, TypeScript compilation for backend, shared package, and frontend. It builds the backend, frontend, infrastructure code, and verifies the Pages build works. Finally, it runs test suites with coverage for backend, frontend, and shared packages, plus a security audit at HIGH level.

**Key characteristic**: Uses shallow clone (`fetch-depth: 1`) for speed since it only needs the current code state.

---

### 2. `e2e.yml` - End-to-End Testing

**Purpose**: Runs full integration tests using Docker and Playwright to verify the application works as a complete system.

**Triggers**:

- `workflow_dispatch` - Manual trigger
- `workflow_run` - Automatically after CI completes successfully

**What it does**:
Starts a complete local stack using Docker Compose (LocalStack for AWS services, backend API, frontend). Seeds test data through the backend's E2E endpoint. Installs Playwright browsers and runs Chromium-based tests against the running stack. Uploads test artifacts and reports if tests fail. Cleans up Docker containers regardless of test outcome.

**Key characteristic**: Skips building the shared package since Docker builds it independently.

---

### 3. `deploy-validation.yml` - Pull Request Validation

**Purpose**: Validates that changes won't break production deployments before merging to main.

**Triggers**:

- `pull_request` to `main` branch

**What it does**:
Runs two sequential validation jobs:

**Job 1 - Backend Deploy Validation**:

- Builds infrastructure code
- Runs CDK synth to validate CloudFormation templates compile
- Runs CDK diff to show what would change (dry-run)

**Job 2 - Pages Deploy Validation**:

- Builds frontend for GitHub Pages with mock configuration
- Verifies bundle paths are correct for the Pages base path
- Uploads build artifact for inspection

**Key characteristic**: Uses fake/invalid values for secrets and API URLs since this is just validation, not actual deployment.

---

### 4. `deploy.yml` - Backend Deployment

**Purpose**: Deploys AWS infrastructure and backend services to production.

**Triggers**:

- `workflow_dispatch` - Manual deployment with optional release tag override
- `workflow_run` - Automatically after E2E tests pass on `release/**` branches

**What it does**:
Runs three jobs with a dedicated manual approval gate between prepare and deploy:

**Job 1 - Prepare**:

- Determines the source branch, commit SHA, and release version
- Resolves version from manual input or branch name (e.g., `release/v1.2.0-feature` → `v1.2.0`)
- Fetches the actual latest commit from the branch (fixes stale commit issue)

**Job 2 - Approve** (requires `prod` environment approval):

- surfaces the resolved release tag and short source SHA in the job name before approval
- keeps the protected approval separate from the deployment work

**Job 3 - Deploy**:

- Checks out the specific commit determined by prepare job
- Builds infrastructure code
- Configures AWS credentials via OIDC (no long-lived secrets)
- Deploys 5 CDK stacks: data, auth, API, backup, and alarm stacks
- Runs smoke tests against deployed API to verify it's healthy

**Key characteristic**: Uses a commit-scoped concurrency group and a dedicated `environment: prod` approval job, so the protected approval always shows the resolved source tag and SHA.

---

### 5. `deploy-pages.yml` - Frontend Deployment

**Purpose**: Builds and deploys the frontend to GitHub Pages, creates release tags.

**Triggers**:

- `workflow_dispatch` - Manual deployment
- `workflow_run` - Automatically after E2E succeeds on `release/**` branches; the workflow then waits for the matching Deploy Backend run on the same commit before it proceeds

**What it does**:
Runs three jobs with a backend-success gate and a dedicated manual approval job:

**Job 1 - Prepare**:

- Same as deploy.yml - determines source branch, SHA, and release version

**Job 2 - Approve** (requires `github-pages` environment approval):

- surfaces the resolved release tag and short source SHA in the job name before approval
- ensures the protected Pages approval is tied to the exact release commit

**Job 3 - Deploy**:

- Creates and pushes an annotated git tag for the release
- Configures AWS credentials (frontend needs AWS config values)
- Builds frontend optimized for GitHub Pages
- Verifies bundle paths are correct for the base path
- Configures GitHub Pages site settings
- Uploads and deploys to GitHub Pages
- Creates a GitHub Release with auto-generated notes
- Runs smoke tests against the deployed Pages site

**Key characteristic**: This is where the release tag is actually created and pushed, and the workflow uses commit-scoped concurrency so one release run cannot cancel another in flight for the same commit.

---

## Composite Actions

### 1. `fetch-latest-sha` - SHA Resolution

**Purpose**: Fixes the stale commit problem by fetching the actual latest commit from a branch.

**Problem it solves**: When `workflow_run` triggers a workflow, it passes `head_sha` from when the triggering workflow started. If commits were pushed during the CI/E2E run, `head_sha` points to an old commit. This action fetches the branch fresh and gets the actual current HEAD.

**How it works**:

- Takes a branch name and optional workflow SHA for comparison
- Fetches the branch from origin
- Resolves the actual latest commit SHA
- Logs a warning if the fetched SHA differs from the workflow SHA
- Falls back to `github.sha` if branch fetch fails (for manual triggers)

**Key characteristic**: Pure shell script action, no dependencies.

---

### 2. `prepare-release` - Release Context Resolution

**Purpose**: Encapsulates all the logic needed to determine what to deploy and what version to use.

**What it does**:

- Checks out code (full history needed for tag operations)
- Calls `fetch-latest-sha` to get the actual commit to deploy
- Runs `resolve-release-context.sh` script to determine the release tag

**Version resolution priority**:

1. Manual input (`release_tag` workflow input)
2. Branch name extraction (`release/vX.Y.Z-*` → `vX.Y.Z`)
3. Existing tag on the commit
4. Fallback to commit SHA

**Outputs**:

- `source_ref` - The branch name
- `source_sha` - The actual commit SHA to deploy
- `release_tag` - The version tag (e.g., `v1.2.0`)
- `release_tag_source` - How the version was determined (for debugging)

**Key characteristic**: Centralizes all release preparation logic so both deploy workflows use identical logic.

---

### 3. `setup-and-build` - Universal Setup

**Purpose**: Eliminates duplication of setup steps across all workflows.

**What it does**:

- Checks out code (configurable fetch depth)
- Sets up Node.js using `.nvmrc` for version consistency
- Installs npm dependencies with `npm ci`
- Optionally builds the shared package

**Configurable inputs**:

- `ref` - Specific git ref to checkout (for deploys)
- `fetch-depth` - 1 for fast CI, 0 for deploys needing tags
- `build-shared` - Whether to build shared package (skip for E2E)
- `skip-checkout` - Skip if already checked out (not currently used)

**Usage patterns**:

- CI/Validation: No inputs needed, uses defaults (fast shallow clone + build shared)
- E2E: `build-shared: 'false'` since Docker handles it
- Deploy: `ref` + `fetch-depth: 0` for specific commit + tag history

**Key characteristic**: Single source of truth for all setup logic. Changing Node version or install method happens in one place.

---

## Supporting Scripts

### `scripts/resolve-release-context.sh`

**Purpose**: Determines the release tag from various sources.

**Logic flow**:

1. If `INPUT_RELEASE_TAG` provided, validate it's semver and use it
2. If branch name matches `release/vX.Y.Z-*`, extract `vX.Y.Z`
3. If commit already has a tag, use existing tag
4. Fall back to short commit SHA

**Validation**:

- Validates semver format (vX.Y.Z)
- Prevents tag collisions (won't overwrite existing tags)
- Handles edge cases like empty inputs

---

## Pipeline Flow Architecture

### Automatic Flow (release branches)

```
Push to release/v1.2.0-feature
         ↓
    ci.yml runs (quality checks)
         ↓
    e2e.yml runs (integration tests)
         ↓
  deploy.yml runs (backend deploy)
   [manual approval required]
         ↓
deploy-pages.yml runs (frontend + tag)
   [manual approval required]
         ↓
   v1.2.0 tag created
```

### Manual Flow

```
workflow_dispatch on any branch
         ↓
  deploy.yml (with optional version override)
         ↓
deploy-pages.yml (automatically after deploy)
```

---

## Part 2: DevOps Interview Walkthrough

_A conversational explanation of the architecture decisions and reasoning._

---

**Interviewer**: Walk me through your GitHub Actions architecture. How do you organize your workflows?

**Engineer**: We use a pipeline pattern with clear separation of concerns. The core idea is that each workflow has a single responsibility, and they chain together through `workflow_run` triggers. We have five main workflows: CI for validation, E2E for integration testing, Deploy Validation for PR checks, Deploy Backend for AWS infrastructure, and Deploy Pages for the frontend.

The key insight is that we don't want one giant workflow file that does everything. Instead, CI runs on every push, E2E runs after CI passes, and deployments only happen on release branches after E2E succeeds. This creates natural quality gates.

---

**Interviewer**: Why did you choose `workflow_run` over workflow dependencies within a single file?

**Engineer**: Two main reasons. First, `workflow_run` decouples the workflows. If CI fails, E2E never triggers. If E2E fails, deploy never triggers. Each workflow can be triggered independently for debugging or manual runs. Second, `workflow_run` lets us use GitHub Environments with manual approvals between stages.

The challenge with `workflow_run` is the stale commit problem. When a workflow triggers another, it passes the SHA from when it started. If you push a fix while CI is running, E2E gets the old SHA. We solved this by creating the `fetch-latest-sha` action that always fetches the actual latest commit from the branch.

---

**Interviewer**: Tell me about the stale commit problem and how you fixed it.

**Engineer**: This was a critical production issue. Here's what was happening:

1. Developer pushes to `release/v1.2.0-feature`
2. CI starts running with commit A
3. Developer pushes a hotfix, now latest is commit B
4. CI finishes, triggers E2E with `head_sha = A` (stale!)
5. E2E passes, triggers Deploy with `head_sha = A`
6. Deploy deploys commit A even though B exists

Worse, the version resolution was using the stale branch reference, so it kept creating tags like v1.0.1, v1.0.2 instead of reading v1.2.0 from the branch name.

The fix is the `fetch-latest-sha` composite action. Before deploying, we fetch the branch fresh and get the actual HEAD. If it differs from the workflow SHA, we log a warning and use the fresh SHA. This guarantees we always deploy the latest code.

---

**Interviewer**: Why composite actions instead of reusable workflows?

**Engineer**: We use both patterns but for different purposes. Composite actions encapsulate job steps - they're like functions for workflow steps. Reusable workflows encapsulate entire jobs. We chose composite actions for our setup logic because:

1. **Granularity**: We needed different combinations. CI needs checkout + setup + build. Deploy needs specific ref checkout + setup + build. E2E needs setup without shared build.

2. **Composability**: With composite actions, we can mix and match. The `prepare-release` action calls `fetch-latest-sha` internally. Workflows can use just `setup-and-build` or the full `prepare-release` + `setup-and-build` chain.

3. **Passing outputs**: Composite actions can pass outputs through the `outputs` section. This let us build a clean interface where `prepare-release` outputs `source_sha`, and `setup-and-build` accepts it as `ref`.

4. **Testing**: Individual actions can be tested in isolation. If setup breaks, we know it's in one of three small files, not buried in a 100-line workflow.

---

**Interviewer**: How do you handle the DRY principle across workflows?

**Engineer**: We went from ~80 lines of duplicated setup code to three composite actions. Before, every workflow had:

- Checkout with different fetch depths
- Setup Node with `.nvmrc`
- `npm ci`
- Build shared (sometimes)

The duplication was subtle but dangerous. If we needed to change the Node version file or add a caching strategy, we'd have to update five places and probably miss one.

Now we have `setup-and-build` with four flexible inputs. The key insight was making inputs truly optional with sensible defaults. `fetch-depth` defaults to 1 for fast CI, but deploys can pass 0. `build-shared` defaults to true, but E2E can skip it. This one action serves all five workflows with different configurations.

---

**Interviewer**: How do you manage secrets and AWS credentials securely?

**Engineer**: We use OIDC (OpenID Connect) for AWS authentication. Instead of storing long-lived AWS access keys in GitHub secrets, we use the `configure-aws-credentials` action with `role-to-assume`. GitHub's OIDC provider generates a short-lived token that AWS validates against our IAM role.

The benefits are huge:

- No secrets rotation needed
- Token expires after the workflow run
- Fine-grained IAM roles per workflow
- Auditable through CloudTrail

The `prod` and `github-pages` environments have additional protection rules requiring manual approval before the job runs. This means even if someone compromises a branch, they can't deploy to production without human approval.

---

**Interviewer**: Explain your release versioning strategy.

**Engineer**: We follow a branch-based release model. When you want to release version 1.2.0, you create a branch named `release/v1.2.0-feature` (the suffix is for description, the version is extracted from `v1.2.0`).

The `resolve-release-context.sh` script handles version resolution with this priority:

1. Manual override from workflow dispatch input
2. Extract from branch name regex
3. Use existing tag on the commit
4. Fallback to commit SHA

This gives flexibility. You can manually deploy any version, or let the branch name determine it automatically. The script validates semver format and prevents tag collisions - it won't let you create v1.2.0 if it already exists.

The tag is only created in `deploy-pages.yml`, not in `deploy.yml`. This ensures we only tag after both backend and frontend are successfully deployed.

The approval step is split into a dedicated gate job, and the job name includes the resolved tag plus short SHA. That makes the protected approval screen show exactly what is being released before anyone clicks approve.

---

**Interviewer**: What would you improve if you had more time?

**Engineer**: A few things:

1. **Stack list duplication**: The five CDK stack names are hardcoded in `deploy.yml` and `deploy-validation.yml`. I'd extract these to a shared configuration file or workflow output.

2. **AWS credential configuration**: The AWS setup is duplicated between deploy workflows. A composite action for `configure-aws-credentials` with our specific settings would be cleaner.

3. **Workflow linting**: I'd add a CI job that validates all workflow files using `actionlint` to catch syntax errors before merging.

4. **Metrics and observability**: Currently we log warnings for stale SHAs, but we don't track how often it happens. Adding workflow telemetry to Datadog or CloudWatch would help us measure the effectiveness of our fixes.

5. **Matrix builds**: The CI workflow runs all checks sequentially. For faster feedback, we could parallelize with a matrix strategy for lint, typecheck, build, and test.

---

**Interviewer**: How do you handle rollbacks if a deployment fails?

**Engineer**: Our architecture supports multiple rollback strategies:

**Immediate rollback**: Since we're using AWS CDK, a failed deployment typically rolls back automatically through CloudFormation. The `cdk deploy` command waits for stack stabilization and rolls back on failure.

**Version-based rollback**: If we need to revert to a previous version, we can trigger a manual workflow_dispatch with a specific release tag pointing to the previous version. The `prepare-release` action accepts manual overrides, so we can deploy v1.1.0 even if v1.2.0 is the current branch.

**Hotfix workflow**: For urgent fixes, we create a new release branch from the last known good tag, apply the fix, and run the full pipeline. This ensures the fix goes through the same quality gates.

The key is that our pipeline is reproducible. Given a commit SHA and version tag, we can redeploy that exact state at any time through manual triggers.

---

**Interviewer**: Final question - how do you ensure the workflows themselves are tested?

**Engineer**: This is an ongoing challenge. Currently we:

1. **Validate syntax**: Use YAML validation and actionlint in CI to catch syntax errors
2. **Test on feature branches**: Workflows trigger on all pushes, so we see them run on PR branches before merging
3. **Dry-run modes**: The `deploy-validation.yml` workflow runs CDK synth and diff without actually deploying
4. **Manual testing**: Use `workflow_dispatch` to test workflows in isolation before they become part of the automatic chain

What we don't have yet is a way to unit test composite actions. The best approach would be a test workflow that calls each composite action with known inputs and validates the outputs. This is on our backlog.

---

## Architecture Principles Summary

1. **Single Responsibility**: Each workflow does one thing well
2. **Quality Gates**: Each stage must pass before the next triggers
3. **DRY**: Composite actions eliminate duplication
4. **Security**: OIDC for AWS, environments for manual approvals
5. **Flexibility**: Manual triggers with overrides for debugging
6. **Observability**: Clear logging of version sources and stale SHA warnings
7. **Performance**: Shallow clones for CI, full history only when needed
