# Architecture

Awdah is a modular monolith with separate frontend, backend, infrastructure, and shared-package workspaces. The runtime architecture is serverless in AWS, but the code structure is intentionally layered so domain rules do not depend on AWS SDK details.

High-level runtime view:

```text
Browser -> static frontend -> API Gateway -> Lambda handlers -> DynamoDB
                 |
                 +-> Cognito (AWS-backed auth)
```

For the written walkthrough, see [docs/architecture/overview.md](docs/architecture/overview.md). For the focused diagram library, see [docs/architecture/diagrams/README.md](docs/architecture/diagrams/README.md).

## Core Boundaries

The backend is split into bounded contexts:

- `salah`: prayer logging, qadaa debt calculation, prayer history, practicing periods
- `sawm`: fasting logs, Ramadan debt calculation, fast history
- `user`: settings, export, delete-account workflow, lifecycle job status
- `shared`: cross-context value objects, repositories, middleware, persistence, and services

The layering is consistent:

```text
presentation / handlers
  -> application / use-cases
    -> domain
      <- infrastructure adapters
```

Handlers validate and adapt. Use cases orchestrate. Domain objects hold the rules. Repositories and AWS integrations sit at the boundary.

## Runtime Surfaces

| Surface                            | Current role                                                              |
| ---------------------------------- | ------------------------------------------------------------------------- |
| React SPA                          | Authenticated app shell plus public pages and offline demo                |
| Cognito                            | Auth for AWS-backed environments                                          |
| HTTP API Gateway                   | Route and JWT boundary in production                                      |
| Lambda                             | One focused handler per use case or operational job                       |
| DynamoDB                           | Primary store for logs, periods, settings, lifecycle jobs, and tombstones |
| EventBridge + stream-driven worker | Backup exports, warm-path scheduling, lifecycle-job processing            |

The local backend uses Express to emulate the Lambda route surface during development. That keeps the application code close to production while still making local debugging straightforward.

## Data And Lifecycle Design

The app uses six DynamoDB tables:

- `PrayerLogs`
- `FastLogs`
- `PracticingPeriods`
- `UserSettings`
- `UserLifecycleJobs`
- `DeletedUsers`

Heavy or sensitive operations do not stay on the synchronous request path:

- data export
- prayer reset
- fast reset
- account deletion

Those operations create lifecycle jobs, return quickly, and finish in background processing. The `DeletedUsers` table acts as the restore-sanitization ledger so restored backups can be cleaned before reuse.

## Deployment Shape

Infrastructure is split into focused CDK stacks:

- `DataStack`
- `AuthStack`
- `ApiStack`
- `BackupStack`
- `AlarmStack`
- `FrontendStack` (optional for CloudFront and S3 hosting)

Production today uses GitHub Pages for the frontend and AWS for backend, auth, and data. The separate `FrontendStack` remains available for environments where Pages is not the right host.

## Development Modes

There are three practical ways to work:

1. cloudless frontend mode with local auth
2. LocalStack-backed local app for API and data work
3. AWS-backed dev deployment for full-cloud validation

That split is intentional: contributors can work on UI and content without paying the operational cost of a full cloud stack, while backend and release work still has a path to realistic validation.

## What To Read Next

- [docs/architecture/overview.md](docs/architecture/overview.md) for the fuller written walk-through
- [docs/architecture/diagrams/README.md](docs/architecture/diagrams/README.md) for the main visual set
- [docs/architecture/database.md](docs/architecture/database.md) for table design and access patterns
- [docs/technical-decisions.md](docs/technical-decisions.md) for implementation rationale
