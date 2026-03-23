# Awdah — Backend

Express server running Clean Architecture + DDD. In production, each route maps to an individual AWS Lambda function behind API Gateway. Locally, the Express server simulates this.

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

## Environment Variables

| Variable                   | Description                                             | Required                      |
| -------------------------- | ------------------------------------------------------- | ----------------------------- |
| `NODE_ENV`                 | `development` / `production`                            | Yes                           |
| `AWS_REGION`               | AWS region                                              | Yes                           |
| `AWS_DEFAULT_REGION`       | AWS default region                                      | Yes                           |
| `LOCALSTACK_ENDPOINT`      | LocalStack URL for local development                    | Dev only                      |
| `PRAYER_LOGS_TABLE`        | Prayer log table name                                   | Prod/staging (optional local) |
| `FAST_LOGS_TABLE`          | Fast log table name                                     | Prod/staging (optional local) |
| `PRACTICING_PERIODS_TABLE` | Practicing periods table name                           | Prod/staging (optional local) |
| `USER_SETTINGS_TABLE`      | User settings table name                                | Prod/staging (optional local) |
| `COGNITO_USER_POOL_ID`     | Cognito User Pool ID                                    | Prod/staging (optional local) |
| `DEV_AUTH_BYPASS`          | Accept requests without `x-user-id` in the local runner | Local only                    |

## Hijri Calendar

All date logic uses the Umm al-Qura calendar via `@umalqura/core`. The `HijriDate` value object in `packages/shared` wraps all conversions. The domain layer operates exclusively in Hijri — Gregorian conversion happens at the API boundary only.

## Testing

Tests live in `__tests__/` folders alongside the code they test. Repository tests use mocked DynamoDB Document Client.

```bash
npm run test             # All tests
npm run test:coverage    # With Istanbul coverage
```
