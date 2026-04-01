# Awdah | عودة

<p align="center">
  <img src="docs/assets/logo_new.png" alt="Awdah Logo" width="160"/>
</p>

**An Islamic ibadah tracker for making up missed prayers and fasts.**

**تطبيق إسلامي لقضاء الصلوات والصيام الفائتة.**

---

Awdah helps Muslims track and gradually fulfil their qadaa (makeup worship). The app calculates how many prayers and Ramadan fasts were missed based on practicing periods the user provides, then helps them log daily progress against that debt without judgment or pressure.

Built as a full-stack serverless application on AWS — Lambda, DynamoDB, Cognito — with GitHub Pages as the current production frontend host, CloudFront available for non-Pages deployments, and full local simulation via LocalStack. The project follows Clean Architecture with two bounded contexts (Salah and Sawm), a CDK-managed infrastructure, and ships bilingual (English + Arabic) with full RTL support from day one.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![CDK](https://img.shields.io/badge/CDK-IaC-FF9900?logo=amazonaws&logoColor=white)](https://docs.aws.amazon.com/cdk)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20AR-26A69A)](https://www.i18next.com)
[![RTL](https://img.shields.io/badge/RTL-Supported-26A69A)](https://developer.mozilla.org/en-US/docs/Glossary/RTL)

## Architecture

Clean Architecture with two bounded contexts: **Salah** and **Sawm**. Domain logic has no AWS dependencies. Lambda handlers are thin wrappers that validate input, call use cases, and return structured responses.

```
Presentation → Application → Domain ← Infrastructure
```

| Layer          | Technology                      | Notes                                                   |
| -------------- | ------------------------------- | ------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite      | CSS Modules, i18next, bilingual + RTL                   |
| Backend        | Node.js, TypeScript, AWS Lambda | One handler per use case, ARM64                         |
| Infrastructure | AWS CDK                         | 6 stacks: Data, Auth, API, Backup, Alarms, Frontend     |
| Database       | DynamoDB                        | PAY_PER_REQUEST, PITR enabled, GSIs for access patterns |
| Auth           | AWS Cognito                     | JWT-based, local simulation via LocalStack in dev       |
| CI/CD          | GitHub Actions                  | Lint, test, build, deploy pipelines                     |

See [docs/architecture/](docs/architecture/) for diagrams and ADRs.

## Features

- **Qadaa debt calculator** — computes missed prayers and fasts from practicing periods, handles non-continuous gaps
- **Daily Salah tracker** — log each of the five prayers, mark on time or late
- **Daily qadaa logger** — log makeup prayers and fasts against the calculated debt
- **Dashboard** — remaining debt, today's prayers, streak, and a projection of when you'll be done
- **History** — browse past days in a read-only log
- **Bilingual** — English and Arabic, full RTL layout, respects system locale by default
- **Dark mode** — respects `prefers-color-scheme`, manual override in settings
- **Offline demo** — full preview using static sample data, no login required

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org) (version in `.nvmrc`)
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for LocalStack)
- [AWS CLI](https://aws.amazon.com/cli/) (optional, for manual LocalStack inspection)

No AWS account or real credentials needed locally.

### Setup

```bash
# Start LocalStack (simulates DynamoDB, S3, SQS, SNS, Cognito, Secrets Manager)
docker compose up -d

# Install dependencies
npm install

# Start Dev servers
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # Lambda runner on http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in the dummy values:

```bash
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=eu-west-1
LOCALSTACK_ENDPOINT=http://localhost:4566
```

### Demo and About

- `/demo` — a fully hydrated preview using bundled sample data, works without a backend
- `/about` — the story behind the project and the developer behind it
- `/contribute` — how to contribute, what areas need help, and the v2 roadmap

## Project Structure

```
awdah/
├── apps/
│   ├── frontend/       # React SPA (Vite, CSS Modules, i18next)
│   └── backend/        # Node.js, Clean Architecture, Lambda handlers
├── infra/              # AWS CDK stacks
├── packages/shared/    # Shared types and domain interfaces
├── docs/               # Architecture docs, OpenAPI spec
└── docker-compose.yml  # LocalStack for local development
```

## Infrastructure

6 CDK stacks deployed in order: data → auth → api → backup → alarm → frontend.

| Stack         | Resources                                                          |
| ------------- | ------------------------------------------------------------------ |
| DataStack     | 6 DynamoDB tables (PITR, PAY_PER_REQUEST)                          |
| AuthStack     | Cognito User Pool and Client                                       |
| ApiStack      | HTTP API Gateway, 24 Lambda functions (ARM64)                      |
| BackupStack   | S3 backup bucket, EventBridge daily export                         |
| AlarmStack    | CloudWatch alarms, SNS alerts                                      |
| FrontendStack | S3 + CloudFront for non-Pages hosting, previews, or custom domains |

## API

Two bounded contexts — **Salah** (prayers) and **Sawm** (fasts) — each with log, debt, and history endpoints. User profile and account deletion are shared. All routes require a Cognito JWT except `/health`. All dates are Hijri `YYYY-MM-DD`.

Full reference: [docs/api/openapi.yaml](docs/api/openapi.yaml)

## CI/CD

| Workflow           | Trigger                           | Purpose                                            |
| ------------------ | --------------------------------- | -------------------------------------------------- |
| `ci.yml`           | PRs, main, manual                 | Lint, typecheck, builds, tests, frontend audit     |
| `test-on-push.yml` | After `ci.yml` succeeds or manual | Dockerized Playwright E2E against the dev stack    |
| `deploy.yml`       | Manual                            | Deploy backend infra to AWS                        |
| `deploy-pages.yml` | Manual or backend deploy          | Build and deploy the prod frontend to GitHub Pages |

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, what areas need help, and how to update the app's static content without writing any code.

## License

Non-commercial. Copyright (c) 2026 Amgad Mahmoud. See [LICENSE](LICENSE) for terms.
