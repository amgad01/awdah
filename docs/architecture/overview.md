# Architecture Overview

Awdah is a serverless SPA. The browser downloads a static React bundle from GitHub Pages, authenticates via AWS Cognito, and communicates with a set of purpose-built Lambda functions behind an HTTP API Gateway. All data is stored in DynamoDB. No servers are maintained.

---

## System Context

```
          ┌──────────────────────────────────────────────────────┐
          │  User's Browser                                       │
          │                                                       │
          │   ┌─────────────────────────────────────────────┐    │
          │   │   React SPA  (GitHub Pages CDN)             │    │
          │   │                                             │    │
          │   │   • All UI rendering                        │    │
          │   │   • i18n (en / ar, RTL-aware)               │    │
          │   │   • No business logic — display only        │    │
          │   └──────────────────┬──────────────────────────┘    │
          │                      │  HTTPS + Cognito JWT           │
          └──────────────────────┼──────────────────────────────-┘
                                 │
                    ┌────────────▼────────────┐
                    │   AWS Cognito           │
                    │   (User Pool)           │
                    │                         │
                    │   • Sign-up / sign-in   │
                    │   • JWT issuance        │
                    │   • Token refresh       │
                    └────────────┬────────────┘
                                 │  Bearer JWT
                    ┌────────────▼────────────┐
                    │   API Gateway (HTTP)     │
                    │                         │
                    │   • JWT authorizer       │
                    │   • Rate limiting        │
                    │   • Route → Lambda       │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
   ┌──────────▼──────┐  ┌────────▼────────┐  ┌─────▼──────────┐
   │  Salah Lambdas  │  │  Sawm Lambdas   │  │  User Lambdas  │
   │                 │  │                 │  │                │
   │  log prayer     │  │  log fast       │  │  profile       │
   │  delete prayer  │  │  delete fast    │  │  export data   │
   │  get debt       │  │  get debt       │  │  delete acct   │
   │  get logs       │  │  get logs       │  │  lifecycle     │
   │  periods CRUD   │  │                 │  │                │
   └────────┬────────┘  └────────┬────────┘  └──────┬─────────┘
            │                    │                   │
            └────────────────────┼───────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   DynamoDB              │
                    │   (PAY_PER_REQUEST)     │
                    │                         │
                    │   PrayerLogs            │
                    │   FastLogs              │
                    │   PracticingPeriods     │
                    │   UserSettings          │
                    │   UserLifecycleJobs     │
                    │   DeletedUsers          │
                    └─────────────────────────┘
```

---

## CDK Stack Dependency Graph

Five stacks deployed in strict dependency order. Each has a single concern. Stacks communicate through exported values (SSM, CFN outputs, CDK references).

```
   ┌─────────────┐
   │  DataStack  │   DynamoDB tables + streams
   └──────┬──────┘
          │ provides table refs
   ┌──────┴──────┐     ┌─────────────┐
   │  AuthStack  │     │  DataStack  │
   │  Cognito    │     │  (same)     │
   └──────┬──────┘     └──────┬──────┘
          │                   │
          └──────────┬─────────┘
                     │ tables + user pool
              ┌──────▼──────┐
              │  ApiStack   │   Lambda × 24, HTTP API,
              │             │   throttle rules, SSM URL
              └──────┬──────┘
                     │ table refs (for export Lambda)
              ┌──────▼──────┐
              │ BackupStack │   EventBridge + S3 export Lambda
              └──────┬──────┘
                     │ DLQ + Lambda refs
              ┌──────▼──────┐
              │  AlarmStack │   CloudWatch alarms, SNS alerts
              └─────────────┘

   (optional)
   ┌──────────────┐
   │ FrontendStack│   S3 + CloudFront for non-Pages hosting
   │ (off by      │   Reads API URL from SSM written by ApiStack
   │  default)    │
   └──────────────┘
```

---

## Request Lifecycle — Authenticated Write

The path a typical POST (e.g. log a prayer) takes from the browser to storage and back.

```
  Browser                Cognito          API Gateway         Lambda            DynamoDB
     │                      │                  │                  │                 │
     │──── sign in ─────────►│                  │                  │                 │
     │◄─── access token ─────│                  │                  │                 │
     │                      │                  │                  │                 │
     │──── POST /v1/salah/log ─────────────────►│                  │                 │
     │     Authorization: Bearer <jwt>          │                  │                 │
     │                      │                  │                  │                 │
     │                      │◄── verify JWT ───│                  │                 │
     │                      │─── claims ───────►│                  │                 │
     │                      │                  │                  │                 │
     │                      │                  │── invoke ────────►│                 │
     │                      │                  │   event.requestContext              │
     │                      │                  │   .authorizer.jwt.claims.sub        │
     │                      │                  │                  │                 │
     │                      │                  │         wrapHandler extracts userId │
     │                      │                  │         Zod validates body          │
     │                      │                  │         use case executes           │
     │                      │                  │                  │─── PutItem ─────►│
     │                      │                  │                  │◄─── OK ──────────│
     │                      │                  │                  │                 │
     │                      │                  │◄── 201 response ─│                 │
     │◄──────────────────────────────────────── 201 JSON ─────────│                 │
```

---

## Lambda Handler Layers

Every Lambda follows the same three-layer structure. No layer knows about the layer above it.

```
  ┌──────────────────────────────────────────────────────────┐
  │  Infrastructure Layer  (handlers/)                        │
  │                                                          │
  │  createHandler(contextName, useCase, { schema, ... })    │
  │    └─► wrapHandler: extracts userId from JWT claims,     │
  │         parses body, calls use case, formats response,   │
  │         catches AppError subtypes → structured JSON      │
  └──────────────────────────┬───────────────────────────────┘
                             │ calls execute(input)
  ┌──────────────────────────▼───────────────────────────────┐
  │  Application Layer  (use-cases/)                          │
  │                                                          │
  │  Orchestrates domain operations.                         │
  │  Validates business rules (e.g. no duplicate period).    │
  │  Calls repository interfaces — never DynamoDB directly.  │
  └──────────────────────────┬───────────────────────────────┘
                             │ calls repository port
  ┌──────────────────────────▼───────────────────────────────┐
  │  Infrastructure Layer  (repositories/)                    │
  │                                                          │
  │  DynamoDB SDK calls.  Maps items to/from domain objects. │
  │  Implements the repository interface from the domain.    │
  └──────────────────────────────────────────────────────────┘
```

---

## DynamoDB Access Patterns

Key design: each table uses a composite key (PK = userId, SK = structured string). GSIs provide additional query axes without full scans.

```
  Table: PrayerLogs
  ┌────────────────┬──────────────────────────────┬──────────────────────────┐
  │ PK (userId)    │ SK                            │ typeDate (GSI sort key)  │
  ├────────────────┼──────────────────────────────┼──────────────────────────┤
  │ u#abc          │ 1446-09-01#FAJR#01JXX...     │ LOG#2026-03-10           │
  │ u#abc          │ 1446-09-01#DHUHR#01JXY...    │ LOG#2026-03-10           │
  │ u#abc          │ 1446-09-02#FAJR#01JXZ...     │ LOG#2026-03-11           │
  └────────────────┴──────────────────────────────┴──────────────────────────┘

  GSI: typeDateIndex
  ┌────────────────┬──────────────────────────────┐
  │ PK (userId)    │ SK (typeDate)                 │  → fetch all logs for a
  ├────────────────┼──────────────────────────────┤     date range efficiently
  │ u#abc          │ LOG#2026-03-10               │
  │ u#abc          │ LOG#2026-03-11               │
  └────────────────┴──────────────────────────────┘

  Table: PracticingPeriods
  ┌────────────────┬──────────────────────┐
  │ PK (userId)    │ SK (periodId / ULID) │  → all periods for a user in
  ├────────────────┼──────────────────────┤     one Query, sorted by ULID
  │ u#abc          │ 01JXX...             │     (chronological order)
  │ u#abc          │ 01JXY...             │
  └────────────────┴──────────────────────┘

  Table: UserLifecycleJobs  (with DynamoDB Stream → Lambda)
  ┌────────────────┬──────────────────────────────┬────────────┐
  │ PK (userId)    │ SK                            │ expiresAt  │
  ├────────────────┼──────────────────────────────┼────────────┤
  │ u#abc          │ JOB#01JXX...                 │ TTL epoch  │  job metadata
  │ u#abc          │ JOB#01JXX...#CHUNK#0         │ TTL epoch  │  export chunk
  │ u#abc          │ JOB#01JXX...#CHUNK#1         │ TTL epoch  │  export chunk
  └────────────────┴──────────────────────────────┴────────────┘
  Stream (NEW_IMAGE) triggers ProcessUserLifecycleJobFn for pending jobs.
  Chunks expire via TTL after the retention window.
```

---

## Environment Topology

Three fully isolated AWS deployments. No shared resources.

```
  GitHub                  AWS Account
  ──────────────────────────────────────────────────────────────
  PR branch  ─────────────►  dev stacks    (manual / hotswap)
  merge → main ───────────►  staging stacks (auto, mirrors prod)
  manual approval ────────►  prod stacks   (requires approval)

  Each environment owns its own:
    Cognito User Pool    DynamoDB tables    Lambda functions
    API Gateway stage    S3 backup bucket   CloudWatch log groups
    SSM parameters       IAM roles
```

---

## Security Boundaries

```
  Internet
      │
      │  HTTPS only
      ▼
  API Gateway ──── validates Cognito JWT ──────────────────────┐
      │            rejects unauthenticated (401)               │
      │            rate-limits per user sub (429)              │
      ▼                                                        │
  Lambda ──── least-privilege IAM role ───────────────────────┤
      │       reads only tables it needs                       │
      │       never logs sensitive data                        │
      │       structured error responses only                  │
      ▼                                                        │
  DynamoDB ── encrypted at rest (AWS-managed) ────────────────┘
              PITR enabled on all tables
              access only from Lambda execution roles
```

---

## Async Lifecycle: Account Export and Deletion

Heavy operations (data export, account deletion) are decoupled from the HTTP request path using a DynamoDB Stream trigger.

```
  POST /v1/user/export
       │
  ┌────▼────────────────────────────────────────────────────┐
  │  InitiateUserLifecycleJobHandler                         │
  │  Writes JOB item to UserLifecycleJobs → returns 202     │
  └────────────────────────────────────────────────────────-┘
                              │  DynamoDB Stream (NEW_IMAGE)
                    ┌─────────▼──────────┐
                    │  ProcessUserLife-   │
                    │  cycleJobFn         │
                    │                    │
                    │  Reads job type     │
                    │  Executes work      │
                    │  (export / delete)  │
                    │  Writes result      │
                    └────────┬────────────┘
                             │ on failure (after 2 retries)
                    ┌────────▼────────────┐
                    │  SQS DLQ            │
                    │                    │
                    │  CloudWatch alarm   │
                    │  SNS email alert    │
                    └─────────────────────┘
```

---

## Data Backup

```
  DynamoDB Tables
       │
       │  PITR (continuous, 35-day window)
       │  ─────────────────────────────────► point-in-time restore
       │
       │  EventBridge: daily at 02:00 UTC
       ▼
  BackupExportLambda
       │
       │  DynamoDB Export to S3 (JSON format)
       ▼
  S3 Backup Bucket
  (versioned, private, SSL-only, S3-managed encryption)
       │
       ├── 0–90 days  →  S3 Standard
       └── 90+ days   →  S3 Glacier
```

---

## Further Reading

| Document                                     | Content                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| [database.md](database.md)                   | Full DynamoDB table schemas, key structures, GSI details |
| [docs/api/openapi.yaml](../api/openapi.yaml) | Full API contract (all routes, request/response shapes)  |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)     | Local dev setup, git workflow, code style                |
