# Architecture Overview

This document explains the current runtime architecture and the repo boundaries that support it.

Use this page for the written walkthrough. Use [diagrams/README.md](diagrams/README.md) for the focused ASCII and Mermaid diagram set.

## 1. System Context

At runtime, Awdah is a static SPA plus a serverless backend.

The clearest visual starting point is [diagrams/01-system-context.md](diagrams/01-system-context.md).

The frontend is responsible for presentation, navigation, localized content, and client-side interaction flow. Core business rules live in backend use cases and domain services, not in the browser.

## 2. Deployment Surfaces

### Frontend

- current production host: GitHub Pages at `/awdah/`
- alternative supported host: S3 + CloudFront via `FrontendStack`
- public routes: `/about`, `/learn`, `/contribute`, `/demo`
- authenticated shell: tracker, dashboard, history, settings

### Backend

- production runtime: API Gateway + Lambda
- local runtime: Express server that calls the same handler/use-case layer
- auth model: Cognito JWTs in AWS-backed environments, local auth mode for cloudless frontend work

## 3. Codebase Boundaries

```text
apps/frontend   -> React SPA, public pages, demo, auth shell
apps/backend    -> handlers, use cases, domain rules, persistence adapters
infra           -> CDK stacks for AWS runtime
packages/shared -> shared types and Hijri/date primitives
```

The backend is a modular monolith with bounded contexts:

- `salah`
- `sawm`
- `user`
- `shared`

The layering is consistent:

```text
presentation / handlers
  -> application / use-cases
    -> domain
      <- infrastructure adapters
```

Handlers validate and adapt. Use cases orchestrate. Domain objects hold the rules. Repositories and AWS integrations sit at the boundary.

## 4. Request Paths

### Normal authenticated request

Example: log a prayer.

See [diagrams/02-authenticated-request.md](diagrams/02-authenticated-request.md).

The handler layer should stay thin. Validation, orchestration, and state changes happen lower in the stack.

### Lifecycle-job request in AWS

Example: export data or reset logs.

See [diagrams/03-user-lifecycle-jobs.md](diagrams/03-user-lifecycle-jobs.md).

This keeps the request path short for heavy or destructive operations.

### Lifecycle-job request in local dev

In LocalStack-style local development, the dispatcher runs the same use case in-process instead of waiting for the AWS stream path.

```text
frontend -> local API
  -> create lifecycle job
  -> in-process dispatcher schedules use case with setTimeout(0)
  -> same job repository/state transitions
```

### Delete-account finalization flow

Delete-account is intentionally split into two stages: app-data deletion and auth cleanup.

```text
1. delete-account job deletes app data and records DeletedUsers tombstone
2. job completes with authCleanupRequired=true and authDeleted=false
3. frontend calls finalize-delete-account
4. Cognito user is deleted or confirmed already absent
5. job is marked authDeleted=true
```

## 5. Operational Async Flows

### Scheduled backup export flow

See [diagrams/04-backup-export.md](diagrams/04-backup-export.md).

### Selective warm-path flow

Production keeps a small set of read Lambdas warm without using provisioned concurrency everywhere.

```text
EventBridge warm rule every 15 minutes
  -> selected read Lambdas only
  -> dashboard/settings read paths stay snappier
  -> no blanket warming for the whole API
```

## 6. Data Model

The backend currently uses six DynamoDB tables:

- `PrayerLogs`
- `FastLogs`
- `PracticingPeriods`
- `UserSettings`
- `UserLifecycleJobs`
- `DeletedUsers`

Key properties of the data model:

- logs are partitioned by `userId`
- historical reads use structured sort keys and `typeDateIndex`
- lifecycle jobs have TTL-backed cleanup
- deleted-user tombstones survive long enough to support restore sanitization

See [database.md](database.md) for table-level detail.

## 7. Infrastructure Stacks

Infrastructure is split by operational concern:

- `DataStack`
- `AuthStack`
- `ApiStack`
- `BackupStack`
- `AlarmStack`
- `FrontendStack`

See [diagrams/05-stack-dependencies.md](diagrams/05-stack-dependencies.md).

This keeps blast radius smaller than a single all-in-one stack while still letting the repo behave as one system.

## 8. Development Modes

The repo intentionally supports three working modes:

1. cloudless frontend work with local auth
2. LocalStack-backed full local app
3. AWS-backed dev deployment

That split matters because it lowers contribution cost for UI and content work without weakening the path to realistic backend and release validation.

## 9. Delivery Workflow

- `main` is a validation branch
- release publishing is driven by `release/**` pushes
- the automatic release lane lives inside `ci.yml`
- manual recovery and controlled reruns use `e2e.yml`, `deploy.yml`, and `deploy-pages.yml`

See [../github-actions-architecture.md](../github-actions-architecture.md) for workflow detail.
