# Awdah عودة

<p align="center">
  <img src="docs/assets/logo.png" alt="Awdah Logo" width="200"/>
</p>

**An Islamic ibadah tracker for making up missed Salah and Fasts.**

**تطبيق لتتبع العبادات الفائتة من صلاة وصيام.**

<p align="center">
  <img src="docs/assets/app_theme.png" alt="Awdah App Theme" width="600"/>
</p>

---

Awdah is a full-stack serverless web application that helps Muslims return to their missed obligatory prayers (Salah) and fasts. Built on AWS - Lambda, DynamoDB, Cognito, and CDK - with a React TypeScript frontend, Clean Architecture, Domain-Driven Design, and full Arabic RTL support. Designed to be private, compassionate, and nearly free to run.

عودة تطبيق ويب يساعدك على قضاء ما فاتك من صلوات وصيام، بهدوء ومن غير حُكم. تتبّع ما عليك، وابدأ عودتك خطوةً بخطوة.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![CDK](https://img.shields.io/badge/CDK-IaC-FF9900?logo=amazonaws&logoColor=white)](https://docs.aws.amazon.com/cdk)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20AR-26A69A)](https://www.i18next.com)
[![RTL](https://img.shields.io/badge/RTL-Supported-26A69A)](https://developer.mozilla.org/en-US/docs/Glossary/RTL)

## Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite, CSS Modules      |
| State          | TanStack Query (server), React hooks (local) |
| i18n / RTL     | i18next, react-i18next — English + Arabic    |
| Backend        | Node.js, TypeScript, Express, AWS Lambda     |
| Infrastructure | AWS CDK, S3, CloudFront                      |
| Database       | DynamoDB (PAY_PER_REQUEST)                   |
| Auth           | AWS Cognito (local bypass for dev)           |
| E2E Testing    | Playwright                                   |
| Unit Testing   | Vitest                                       |
| CI/CD          | GitHub Actions                               |
| Local dev      | Docker Compose, LocalStack                   |

## Prerequisites

- [Node.js](https://nodejs.org) (version in `.nvmrc`)
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (or Docker Engine + Compose plugin)
- [AWS CLI](https://aws.amazon.com/cli/) (for occasional LocalStack inspection)

No AWS account or real credentials needed for local development.

### Local Development (Docker Compose)

1. Ensure Docker is running.
2. Run `docker compose up --build localstack backend frontend`.
3. Wait until the services report healthy.
4. Frontend: `http://localhost:8080`, Backend: `http://localhost:3000`.

The frontend proxies API calls to the local Lambda runner. LocalStack simulates DynamoDB, S3, SQS, SNS, EventBridge, and Secrets Manager.

### Public demo route

- Demo page: `http://localhost:8080/demo`
- Static demo data: `apps/frontend/public/demo-data/sample-user.json`

The `/demo` route is intentionally backed by a bundled JSON asset rather than live AWS data. That makes it useful for portfolio links, hiring-manager walkthroughs, and non-AWS static hosting where only the frontend is deployed.

### Local AWS credentials

LocalStack does not require real credentials. Copy `.env.example` to `.env.local` and use dummy values:

```bash
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=eu-west-1
LOCALSTACK_ENDPOINT=http://localhost:4566
```

## Architecture

Clean Architecture + Domain-Driven Design with two bounded contexts: **Salah** and **Sawm**.

```
Presentation → Application → Domain ← Infrastructure
```

See [docs/architecture/](docs/architecture/) for diagrams and detailed documentation.

## Project Structure

```
awdah/
├── apps/
│   ├── frontend/           # React SPA (Vite, CSS Modules, i18next)
│   │   ├── src/
│   │   │   ├── features/   # Bounded context UI (salah, sawm, dashboard, history, settings, auth)
│   │   │   ├── components/ # Shared UI components (card, progress-bar, day-nav, language-switcher)
│   │   │   ├── hooks/      # Custom hooks (use-auth, use-language, use-worship)
│   │   │   ├── i18n/       # Translation files (en.json, ar.json)
│   │   │   ├── utils/      # Formatters (fmtNumber, date-utils)
│   │   │   └── lib/        # API client
│   │   └── e2e/            # Playwright E2E tests
│   └── backend/            # Express server simulating AWS Lambda
│       └── src/contexts/   # Salah + Sawm bounded contexts (Clean Architecture)
├── infra/                  # AWS CDK stacks (auth, api, data, backup, alarm, frontend)
├── packages/shared/        # Shared types, Hijri logic, domain interfaces
├── docker/                 # LocalStack config + bootstrap scripts
├── docs/                   # Public documentation
│   ├── api/openapi.yaml    # OpenAPI 3.1.0 spec
│   └── architecture/       # Database design, diagrams
├── .github/workflows/      # CI/CD pipelines
└── docker-compose.yml      # Local orchestration
```

## Documentation

| Document                                                       | Description                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [docs/architecture/database.md](docs/architecture/database.md) | DynamoDB table design, key schema, access patterns         |
| [docs/api/openapi.yaml](docs/api/openapi.yaml)                 | Full REST API reference (OpenAPI 3.1.0)                    |
| [docs/religious-logic-faq.md](docs/religious-logic-faq.md)     | FAQ — how religious rulings and calendar logic are handled |
| [apps/frontend/README.md](apps/frontend/README.md)             | Frontend setup, scripts, and environment variables         |
| [apps/backend/README.md](apps/backend/README.md)               | Backend architecture, Lambda handlers, and testing         |

## API Documentation

The full API reference is in [docs/api/openapi.yaml](docs/api/openapi.yaml) (OpenAPI 3.1.0).

### Endpoints at a glance

| Method   | Path                           | Description                          |
| -------- | ------------------------------ | ------------------------------------ |
| `GET`    | `/health`                      | Health check (no auth)               |
| `POST`   | `/v1/salah/log`                | Log a prayer (obligatory or qadaa)   |
| `DELETE` | `/v1/salah/log`                | Delete a prayer log entry            |
| `DELETE` | `/v1/salah/logs`               | Delete all prayer log entries        |
| `GET`    | `/v1/salah/debt`               | Get Salah qadaa debt summary         |
| `GET`    | `/v1/salah/history`            | Get prayer log history by date range |
| `POST`   | `/v1/salah/practicing-period`  | Add a practicing period              |
| `PUT`    | `/v1/salah/practicing-period`  | Update a practicing period           |
| `GET`    | `/v1/salah/practicing-periods` | List all practicing periods          |
| `DELETE` | `/v1/salah/practicing-period`  | Delete a practicing period           |
| `POST`   | `/v1/sawm/log`                 | Log a fast (obligatory or qadaa)     |
| `DELETE` | `/v1/sawm/log`                 | Delete a fast log entry              |
| `DELETE` | `/v1/sawm/logs`                | Delete all fast log entries          |
| `GET`    | `/v1/sawm/debt`                | Get Sawm qadaa debt summary          |
| `GET`    | `/v1/sawm/history`             | Get fast log history by date range   |
| `GET`    | `/v1/user/profile`             | Get user profile                     |
| `POST`   | `/v1/user/profile`             | Create or update user profile        |
| `DELETE` | `/v1/user/account`             | Delete the authenticated account     |
| `GET`    | `/v1/user/export`              | Export all user data                 |

All routes except `/health` require a Cognito JWT `Bearer` token. All dates are Hijri `YYYY-MM-DD`.

## CI/CD

| Workflow           | Trigger           | Purpose                                                        |
| ------------------ | ----------------- | -------------------------------------------------------------- |
| `ci.yml`           | PRs, main, manual | ESLint, Prettier, tsc, builds, Vitest, npm audit               |
| `e2e.yml`          | Manual            | Playwright E2E against the local full stack                    |
| `deploy.yml`       | Manual            | Deploy backend infra, build SPA, deploy CloudFront frontend    |
| `deploy-pages.yml` | Manual            | Build SPA with GitHub Pages base path and deploy to `gh-pages` |

## Deployment Targets

| Target       | Version | Frontend URL                        | Notes                                    |
| ------------ | ------- | ----------------------------------- | ---------------------------------------- |
| GitHub Pages | v1      | `https://<org>.github.io/awdah`     | Set `VITE_BASE_PATH=/awdah/` at build    |
| CloudFront   | v2      | `https://awdah.app` (custom domain) | `VITE_BASE_PATH` unset (defaults to `/`) |

Both targets call the same AWS backend. To allow a GitHub Pages origin in the API CORS policy, pass `--context frontendOrigin=https://<org>.github.io` when running `cdk deploy`.

See [`private-docs/decisions/deployment-strategy.md`](private-docs/decisions/deployment-strategy.md) for complete step-by-step setup.

## Contributing

1. Create a branch from `main` using the naming convention: `type/ticket-description`
   - Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `infra/`
   - Example: `feat/123-new-thing`
2. Make changes and ensure pre-commit hooks pass
3. Open a PR, CI must be green before merge
4. Never commit directly to `main`

## License

Proprietary. Copyright (c) 2026 Amgad Mahmoud. All rights reserved.
See [LICENSE](LICENSE) for full terms (Non-commercial use only, collaboration and permissions).
