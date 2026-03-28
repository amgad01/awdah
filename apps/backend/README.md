# Awdah — Backend

Express server running Clean Architecture + DDD. In production, each route maps to an individual AWS Lambda function behind API Gateway. Locally, the Express server simulates this.

## Architecture Highlights

- **24 Lambda handlers** across 3 bounded contexts
- **28 test files** (unit + integration + API)
- Structured error handling via `AppError` hierarchy
- Zod input validation at every handler boundary
- Pino structured logging with `requestId`, `userId`, `context`, `duration`
- Security headers on every response (CSP, HSTS, no-store, X-Frame-Options)
- Cursor-based pagination (not offset)
- AWS SDK adaptive retry with 5 max attempts

## Bounded Contexts

| Context  | Responsibility                                            |
| -------- | --------------------------------------------------------- |
| `salah`  | Prayer logging (obligatory + qadaa), debt calculation     |
| `sawm`   | Fast logging (obligatory + qadaa), Ramadan debt           |
| `user`   | Profile, onboarding, account deletion, data export        |
| `shared` | Practicing periods, value objects, cross-context services |

## Architecture

```
contexts/{context}/
├── domain/
│   ├── entities/          # Aggregate roots, domain objects
│   ├── value-objects/     # Immutable typed values
│   ├── repositories/      # Interfaces only
│   └── services/          # Domain service interfaces
├── application/
│   └── use-cases/         # Application layer orchestration
└── (infrastructure is in shared/)

shared/
├── domain/                # Cross-context entities, value objects, services
├── infrastructure/
│   └── persistence/       # DynamoDB repository implementations
├── middleware/             # Auth, validation, error handling
├── config/                # Environment settings
└── di/                    # Dependency injection container
```

All DynamoDB repositories extend `BaseDynamoDBRepository<T>` which provides `findAll`, `findWithPrefix`, `findInRange`, `retrieve`, `persist`, `deleteItem`, and `countByGSI`.

## Scripts

```bash
npm run dev              # Start Express server (ts-node)
npm run build            # Compile TypeScript
npm run typecheck        # Type-check without emitting
npm run test             # Run Vitest unit + integration tests
npm run test:coverage    # Run tests with coverage report
npm run test:api         # Run API integration tests only
```

## Maintenance & Recovery

Operational scripts for backup, restore, and cleanup are documented in [docs/scripts.md](./docs/scripts.md).

## Environment Variables

| Variable                    | Description                                             | Required                      |
| --------------------------- | ------------------------------------------------------- | ----------------------------- |
| `NODE_ENV`                  | `development` / `production`                            | Yes                           |
| `AWS_REGION`                | AWS region                                              | Yes                           |
| `AWS_DEFAULT_REGION`        | AWS default region                                      | Yes                           |
| `LOCALSTACK_ENDPOINT`       | LocalStack URL for local development                    | Dev only                      |
| `PRAYER_LOGS_TABLE`         | Prayer log table name                                   | Prod/staging (optional local) |
| `FAST_LOGS_TABLE`           | Fast log table name                                     | Prod/staging (optional local) |
| `PRACTICING_PERIODS_TABLE`  | Practicing periods table name                           | Prod/staging (optional local) |
| `USER_SETTINGS_TABLE`       | User settings table name                                | Prod/staging (optional local) |
| `USER_LIFECYCLE_JOBS_TABLE` | Lifecycle jobs table name                               | Prod/staging (optional local) |
| `DELETED_USERS_TABLE`       | Tombstone ledger table name                             | Prod/staging (optional local) |
| `COGNITO_USER_POOL_ID`      | Cognito User Pool ID                                    | Prod/staging (optional local) |
| `DEV_AUTH_BYPASS`           | Accept requests without `x-user-id` in the local runner | Local only                    |

## Hijri Calendar

All date logic uses the Umm al-Qura calendar via `@umalqura/core`. The `HijriDate` value object in `packages/shared` wraps all conversions. The domain layer operates exclusively in Hijri — Gregorian conversion happens at the API boundary only.

## Testing

Tests live in `__tests__/` folders alongside the code they test. Repository tests use mocked DynamoDB Document Client.

```bash
npm run test             # All tests
npm run test:coverage    # With Istanbul coverage
```

## API Routes

24 routes across 3 contexts. Full reference in [docs/api/openapi.yaml](../../docs/api/openapi.yaml).

| Context | Routes | Operations                                                                     |
| ------- | ------ | ------------------------------------------------------------------------------ |
| Salah   | 10     | Log prayer, delete, reset, debt calc, history (paged), practicing periods CRUD |
| Sawm    | 6      | Log fast, delete, reset, debt calc, history (paged)                            |
| User    | 8      | Profile, account deletion, data export, lifecycle job status                   |

## Domain Services

| Service                   | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `SalahDebtCalculator`     | Calculates prayer qadaa debt across gap periods     |
| `SawmDebtCalculator`      | Calculates fasting debt for Ramadans in gap periods |
| `UmAlQuraCalendarService` | Hijri calendar operations via `@umalqura/core`      |

## Recent Fixes

- `HijriDate` month-length validation now rejects invalid day-30 overflow in 29-day Hijri months.
- `UmAlQuraCalendarService` now has direct unit tests for Ramadan day counts and date-span calculations.

## Known Limitations

- Practicing period overlap detection has a theoretical TOCTOU race — documented, near-zero probability at current scale
- Debt calculation uses GSI scan for counting — works at current scale, CQRS-lite counter planned for v2
