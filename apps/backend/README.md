# Awdah Backend

The backend is a TypeScript codebase organised around Clean Architecture. In production, the HTTP surface is served by API Gateway plus Lambda. Locally, `src/index.ts` runs an Express server that exercises the same use cases and middleware patterns.

For the deeper reasoning behind the folder structure, modular-monolith shape, and lightweight DI approach, read [docs/architecture.md](docs/architecture.md). That file is written in English and German.

## Responsibilities

| Context  | Owns                                                                |
| -------- | ------------------------------------------------------------------- |
| `salah`  | prayer logs, qadaa debt, prayer history, practicing periods         |
| `sawm`   | fast logs, Ramadan debt, fast history                               |
| `user`   | profile/settings, export, delete-account flow, lifecycle job status |
| `shared` | middleware, persistence, cross-context services, local HTTP runner  |

## Code Layout

```text
src/
├── contexts/
│   ├── salah/
│   ├── sawm/
│   ├── user/
│   └── shared/
├── shared/
│   ├── config/
│   ├── di/
│   ├── infrastructure/
│   ├── middleware/
│   └── validation/
└── index.ts
```

Within each bounded context, the pattern is consistent:

```text
domain/ -> application/use-cases/ -> infrastructure/handlers/
```

## API Shape

The public API surface documented in [../../docs/api/openapi.yaml](../../docs/api/openapi.yaml) currently contains:

- `GET /health`
- 7 Salah paths
- 5 Sawm paths
- 5 User paths

That documented surface is smaller than the total handler count in the repo because some functions are internal or operational:

- lifecycle job worker
- backup export job
- local-only E2E seed route

## Lifecycle Jobs

Export, delete-account, reset-prayers, and reset-fasts are treated as lifecycle jobs rather than long synchronous requests. The request path creates a job record, background processing completes the work, and the client can poll job status or download export output when ready.

## Local Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run test
npm run test:coverage
npm run test:api
```

From the repo root:

```bash
npm run dev:backend
npm run test --workspace=apps/backend
```

## Environment Notes

The backend expects table names and Cognito identifiers through environment variables in AWS-backed environments. Local work can use LocalStack-backed values or the repo’s local dev bootstrap.

Important variables include:

- `PRAYER_LOGS_TABLE`
- `FAST_LOGS_TABLE`
- `PRACTICING_PERIODS_TABLE`
- `USER_SETTINGS_TABLE`
- `USER_LIFECYCLE_JOBS_TABLE`
- `DELETED_USERS_TABLE`
- `COGNITO_USER_POOL_ID`
- `LOCALSTACK_ENDPOINT`

## Testing

The backend test mix includes:

- domain and use-case unit tests
- repository and service tests
- API-level integration coverage for the Express runner

The repo root `npm run check` script already includes backend build, typecheck, tests, and audit.

## Operational Docs

- Script guide: [docs/scripts.md](docs/scripts.md)
- Backend architecture rationale: [docs/architecture.md](docs/architecture.md)
- OpenAPI: [../../docs/api/openapi.yaml](../../docs/api/openapi.yaml)
- Architecture overview: [../../docs/architecture/overview.md](../../docs/architecture/overview.md)
