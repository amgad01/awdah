# Awdah | عودة

<p align="center">
  <img src="docs/assets/logo_new.png" alt="Awdah Logo" width="160"/>
</p>

**An Islamic ibadah tracker for making up missed prayers and fasts.**

**تطبيق إسلامي لقضاء الصلوات والصيام الفائتة.**

---

Awdah helps Muslims track and gradually fulfil their qadaa (makeup worship). The app calculates how many prayers and Ramadan fasts were missed based on practicing periods the user provides, then helps them log daily progress against that debt without judgment or pressure.

Built as a full-stack serverless application on AWS, with Lambda, DynamoDB, and Cognito, plus GitHub Pages as the current production frontend host, CloudFront available for non-Pages deployments, and full local simulation via LocalStack. The project follows Clean Architecture across three domain contexts (Salah, Sawm, and User), uses CDK-managed infrastructure, and ships with dynamic multilingual support (Arabic, English, German, and extensible language onboarding) with full RTL support.

Quick links:

- Live app: [https://amgad01.github.io/awdah/](https://amgad01.github.io/awdah/)
- LinkedIn: [https://www.linkedin.com/in/amgad-m/](https://www.linkedin.com/in/amgad-m/)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![CDK](https://img.shields.io/badge/CDK-IaC-FF9900?logo=amazonaws&logoColor=white)](https://docs.aws.amazon.com/cdk)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20AR-26A69A)](https://www.i18next.com)
[![RTL](https://img.shields.io/badge/RTL-Supported-26A69A)](https://developer.mozilla.org/en-US/docs/Glossary/RTL)

## Architecture

Clean Architecture with three main domain contexts: **Salah**, **Sawm**, and **User**. Domain logic has no AWS dependencies. Lambda handlers are thin wrappers that validate input, call use cases, and return structured responses.

```
Presentation → Application → Domain ← Infrastructure
```

| Layer          | Technology                      | Notes                                                   |
| -------------- | ------------------------------- | ------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite      | CSS Modules, i18next, dynamic multilingual + RTL        |
| Backend        | Node.js, TypeScript, AWS Lambda | One handler per use case, ARM64                         |
| Infrastructure | AWS CDK                         | 6 stacks: Data, Auth, API, Backup, Alarms, Frontend     |
| Database       | DynamoDB                        | PAY_PER_REQUEST, PITR enabled, GSIs for access patterns |
| Auth           | AWS Cognito                     | JWT-based, local simulation via LocalStack in dev       |
| CI/CD          | GitHub Actions                  | Lint, test, build, deploy pipelines                     |

See [docs/architecture/overview.md](docs/architecture/overview.md) for system diagrams, stack dependencies, request lifecycle, and data access patterns.

## Features

- **Qadaa debt calculator** - computes missed prayers and fasts from practicing periods, handles non-continuous gaps
- **Daily Salah tracker** - log each of the five prayers, mark on time or late
- **Daily qadaa logger** - log makeup prayers and fasts against the calculated debt
- **Dashboard** - remaining debt, today's prayers, streak, and a projection of when you'll be done
- **History** - browse past days in a read-only log
- **Language support** - dynamic multilingual architecture (English, Arabic, German), full RTL layout, respects system locale by default
- **Dark mode** - respects `prefers-color-scheme`, manual override in settings
- **Offline demo** - full preview using static sample data, no login required

## Local Development

Awdah supports three local development modes — pick the one that fits your goal.

### Mode 1 — Cloudless (no Docker, no AWS account)

The fastest way to start contributing to UI, translations, or public-page content. The frontend runs entirely in-memory with a built-in mock auth backend. No LocalStack, no Docker, no credentials needed.

```bash
npm install
npm run dev:local      # sets VITE_AUTH_MODE=local in .env.local
npm run dev:frontend   # http://localhost:5173
```

The app boots in local auth mode: you can sign up / log in with any email and password, and your data is stored in memory until you close the tab. The `/demo` route also works without any extra setup.

### Mode 2 — Full stack with LocalStack (no AWS account)

Use this when your change needs real auth, tracker data, settings, or any API route. LocalStack simulates DynamoDB, S3, SQS, and Cognito locally.

```bash
# Prerequisites: Node.js (version in .nvmrc), Docker

npm install

# Start LocalStack
docker compose up -d localstack

# Start dev servers in separate terminals
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

### Mode 3 — AWS staging / dev environment

For full end-to-end testing against a real AWS account. Requires valid AWS credentials and a deployed dev stack.

```bash
./scripts/check-aws-session.sh   # verify credentials
./scripts/deploy-all.sh          # deploy all CDK stacks to dev
npm run dev:frontend             # point against the deployed API
```

### Prerequisites (modes 2 and 3)

- [Node.js](https://nodejs.org) (version in `.nvmrc`)
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for LocalStack, mode 2 only)
- [AWS CLI](https://aws.amazon.com/cli/) (optional, for manual LocalStack inspection)

### Pages Check

If you touch routing, deploy config, `index.html`, or `404.html`, run:

```bash
npm run check:pages
```

That builds the frontend locally with the real production base path `/awdah/` and verifies that the generated bundle still points to `https://amgad01.github.io/awdah/`.

For contributor-specific setup paths, content-only edits, translation work, and PR workflow details, see [CONTRIBUTING.md](CONTRIBUTING.md). The hosted [/contribute](https://amgad01.github.io/awdah/contribute) page is the source of truth for work areas and roadmap items.

### Demo and About

- `/demo` - a fully hydrated preview using bundled sample data, works without a backend
- `/about` - the story behind the project and the developer behind it
- `/contribute` - how to contribute, what areas need help, and the v2 roadmap

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

| Stack         | Resources                                                                   |
| ------------- | --------------------------------------------------------------------------- |
| DataStack     | 6 DynamoDB tables (PAY_PER_REQUEST, PITR where needed, GSIs for log access) |
| AuthStack     | Cognito User Pool and Client                                                |
| ApiStack      | HTTP API Gateway, 24 Lambda functions (ARM64)                               |
| BackupStack   | S3 backup bucket, EventBridge daily export                                  |
| AlarmStack    | CloudWatch alarms, SNS alerts                                               |
| FrontendStack | S3 + CloudFront for non-Pages hosting, previews, or custom domains          |

## API

Three route groups: **Salah** (prayers), **Sawm** (fasts), and **User** (profile and lifecycle operations). All protected routes require a Cognito JWT, while `/health` remains public. All dates are Hijri `YYYY-MM-DD`.

Full reference: [docs/api/openapi.yaml](docs/api/openapi.yaml)

## CI/CD

| Workflow                | Trigger                                    | Purpose                                                                                      |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `ci.yml`                | Every push, PRs, manual                    | Lint, typecheck, builds, tests, security audit                                               |
| `e2e.yml`               | After `ci.yml` succeeds, or manual         | Dockerized Playwright E2E against the full local stack                                       |
| `deploy-validation.yml` | PRs targeting `main`                       | Credential-free dry run: CDK synth + Pages build with placeholder inputs, no publish         |
| `deploy.yml`            | After `e2e.yml` on `release/**`, or manual | Resolve source SHA + version from branch name, CDK deploy to prod, smoke-test API            |
| `deploy-pages.yml`      | After `deploy.yml` on `release/**`, manual | Build frontend from same source SHA, create release tag, deploy to Pages, publish GH release |

`main` is validation only. Production publishing happens from branches whose names begin with the `release/vX.Y.Z-*` prefix. The release version is derived from that branch name prefix — no auto-increment.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, language support, and content-update guidance. For current work areas and roadmap items, use the hosted [/contribute](https://amgad01.github.io/awdah/contribute) page.

Translation note: only `apps/frontend/src/i18n/*.json` files carry `_meta` and participate in language auto-discovery. Public page content under `apps/frontend/public/data/` stays schema-specific and does not use `_meta`, and glossary tooltips live in `apps/frontend/src/content/glossary/glossary.json`.

For a full new-language rollout, add the matching `about-<code>.json`, `contributing-<code>.json`, `faq-<code>.json`, `sample-user.json` story entry, and any glossary entries that should render natively so the demo route and onboarding copy stay localized too.

## License

Non-commercial. Copyright (c) 2026 Amgad Mahmoud. See [LICENSE](LICENSE) for terms.
