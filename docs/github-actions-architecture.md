# GitHub Actions Architecture

This repo uses a small workflow set with clear separation between validation, release automation, and manual recovery.

## Workflow Inventory

| Workflow                | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `ci.yml`                | Main quality gate and automatic release lane for `release/**` pushes     |
| `deploy-validation.yml` | PR-only deploy rehearsal for backend and Pages                           |
| `e2e.yml`               | Manual Dockerized Playwright run for a chosen ref/SHA                    |
| `deploy.yml`            | Manual backend deploy with explicit release-context resolution           |
| `deploy-pages.yml`      | Manual Pages deploy, release-tag creation, and GitHub Release publishing |

## 1. `ci.yml`

`ci.yml` is the center of the delivery story.

### Triggers

- pull requests to `main`
- pushes to `main`
- pushes to `release/**`
- manual dispatch

### What always runs

The `quality` job performs the normal repo gate:

- install dependencies
- build shared package
- lint
- format check
- typecheck across workspaces
- build backend, frontend, and infra
- verify Pages build
- run backend/frontend/shared tests
- run security audit

### What only runs for `release/**`

For release branches, the same workflow continues into:

1. `release-prepare`
2. `release-e2e`
3. `release-backend`
4. `release-pages`

That matters because the release path now stays inside one workflow run instead of bouncing across chained `workflow_run` handoffs.

## 2. `deploy-validation.yml`

This workflow runs only on pull requests to `main`.

It does two dry runs:

- backend deploy validation via CDK synth/diff
- Pages build validation with placeholder environment values

The goal is to catch deploy-shape regressions before merge without needing live credentials or publishing anything.

## 3. `e2e.yml`

This is a manual, Dockerized integration workflow.

It:

- checks out the requested ref/SHA
- starts LocalStack, backend, and frontend containers
- seeds test users
- runs Playwright Chromium tests
- uploads Playwright artifacts

This is for debugging or deliberate reruns. It is not part of the automatic release chain anymore.

## 4. `deploy.yml`

Manual backend deploy workflow.

### Structure

1. `prepare`
2. `approve`
3. `deploy`

### Important properties

- release context is resolved before approval
- the approval job name includes the resolved tag and source SHA
- the deploy job checks out the exact prepared commit
- production deploy uses OIDC-based AWS credentials

The backend deploy targets:

- data
- auth
- api
- backup
- alarm

## 5. `deploy-pages.yml`

Manual frontend deploy workflow for GitHub Pages.

### Structure

1. `prepare`
2. `approve`
3. `deploy`

### Important properties

- resolves the same release context pattern as `deploy.yml`
- creates or verifies the annotated release tag
- builds the frontend for the Pages base path
- uploads the Pages artifact
- deploys to GitHub Pages
- publishes the GitHub Release
- smoke-tests the deployed site

## Release Version Resolution

Both manual deploy workflows use the shared `prepare-release` action and the same version rules:

1. explicit `release_tag` input
2. version parsed from a matching `release/vX.Y.Z-*` branch
3. existing semver tag already attached to the source commit

If none of those produce a valid release tag, the workflow fails closed.

## Release Flow Summary

### Normal validation flow

```text
PR to main
  -> ci.yml quality
  -> deploy-validation.yml
```

### Automatic release flow

```text
push to release/vX.Y.Z-*
  -> ci.yml quality
  -> ci.yml release-prepare
  -> ci.yml release-e2e
  -> ci.yml release-backend
  -> ci.yml release-pages
```

### Manual recovery flow

```text
workflow_dispatch
  -> e2e.yml
  or deploy.yml
  or deploy-pages.yml
```

## Why This Shape

The workflow design optimizes for three things:

- one authoritative automatic release path
- exact ref/SHA visibility before protected approvals
- manual escape hatches without reintroducing release-context drift
