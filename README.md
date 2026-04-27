# Awdah | عودة

<p align="center">
  <img src="docs/assets/logo_new.png" alt="Awdah Logo" width="160"/>
</p>

**A multilingual tracker for making up missed prayers and Ramadan fasts.**

**تطبيق متعدد اللغات لتتبع العبادات و قضاء الصلوات والصيام الفائت.**

Awdah helps users estimate missed worship from their own practicing history, then log recovery without turning the experience into a guilt-heavy checklist. The app handles Salah, Sawm, practicing periods, privacy-sensitive account flows, and public educational content in Arabic, English, and German.

Quick links:

- LinkedIn: [https://www.linkedin.com/in/amgad-m/](https://www.linkedin.com/in/amgad-m/)
- Live app: [https://amgad01.github.io/awdah/](https://amgad01.github.io/awdah/)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Architecture docs: [docs/architecture/overview.md](docs/architecture/overview.md)
- API spec: [docs/api/openapi.yaml](docs/api/openapi.yaml)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![CDK](https://img.shields.io/badge/CDK-IaC-FF9900?logo=amazonaws&logoColor=white)](https://docs.aws.amazon.com/cdk)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20AR%20%7C%20DE-26A69A)](https://www.i18next.com)
[![RTL](https://img.shields.io/badge/RTL-Supported-26A69A)](https://developer.mozilla.org/en-US/docs/Glossary/RTL)

## What Is In This Repo

| Area     | Current implementation                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend | React 19 SPA, Vite, CSS Modules, i18next, RTL-aware layout                                                        |
| Backend  | Express-based local runner, Lambda-oriented handlers, Clean Architecture                                          |
| Infra    | AWS CDK stacks for data, auth, API, backup, alarms, and optional frontend hosting                                 |
| Data     | DynamoDB tables for prayer logs, fast logs, practicing periods, settings, lifecycle jobs, and deletion tombstones |
| Auth     | Cognito in AWS deployments, local auth mode for cloudless frontend work                                           |
| Testing  | Vitest across workspaces, Playwright for critical frontend flows                                                  |

The production frontend is currently published on GitHub Pages under `/awdah/`. The repo also keeps a `FrontendStack` for S3 + CloudFront deployments when Pages is not the right fit.

## Feature Snapshot

- Salah debt calculation based on practicing periods
- Sawm debt calculation across missed Ramadans
- Daily logging for current worship and qadaa recovery
- Weekly worship charts for Salah and Sawm tracking
- Practicing-period CRUD with dual-date display
- History views, paged history APIs, and privacy-sensitive settings flows
- Public `/about`, `/learn`, `/contribute`, and `/demo` routes that work without live backend data
- Runtime-loaded public content JSON with English fallback
- Arabic, English, and German UI with RTL handling where needed

## System Shape

The codebase is a modular monolith with explicit bounded contexts:

- `salah`: prayer logging, debt calculation, prayer history, practicing periods
- `sawm`: fast logging, debt calculation, fast history
- `user`: settings, export, delete-account workflow, lifecycle job status

The backend keeps domain and application logic free of AWS SDK details. Lambda handlers and the local Express runner stay thin: parse input, resolve `userId`, call a use case, and format the response.

For a deeper walkthrough, start with:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/architecture/overview.md](docs/architecture/overview.md)
- [docs/architecture/database.md](docs/architecture/database.md)
- [docs/github-actions-architecture.md](docs/github-actions-architecture.md)

## Local Development

### 1. Cloudless frontend work

Use this for docs, translations, public-page content, and most UI work.

```bash
npm install
npm run dev:local
npm run dev:frontend
```

This writes `VITE_AUTH_MODE=local` to `apps/frontend/.env.local`. You can sign in with any email and password, and the `/about`, `/learn`, `/contribute`, and `/demo` routes work without extra setup.

### 2. Full local app with LocalStack

Use this when your change touches real API flows, settings, or data-backed screens.

```bash
npm install
npm run docker:up
npm run dev:backend
npm run dev:frontend
```

If you need CDK-level LocalStack parity rather than the default local bootstrap, use:

```bash
./scripts/deploy/deploy-localstack.sh data
./scripts/deploy/deploy-localstack.sh auth
./scripts/deploy/deploy-localstack.sh api
```

### 3. AWS-backed development

Use this for real-cloud validation.

```bash
./scripts/deploy/check-aws-session.sh
npm run deploy:all:dev
```

## Quality Gates

```bash
npm run check:quick   # shared build + lint + format + typecheck
npm run check         # repo gate with tests, builds, Pages check, and audit
npm run check:pages   # production Pages build verification
npm run test:e2e      # Playwright suite
```

If you touch routing, deploy config, `index.html`, or `404.html`, run `npm run check:pages`.

## API And Deployment Notes

- Public API documentation lives in [docs/api/openapi.yaml](docs/api/openapi.yaml).
- Production publishing is release-branch driven. `main` is a validation branch, not an automatic production-publish branch.
- The automatic release lane runs inside [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for `release/**` pushes.
- Manual recovery and controlled reruns use `deploy.yml`, `deploy-pages.yml`, and `e2e.yml`.

## Repo Layout

```text
awdah/
├── apps/
│   ├── frontend/
│   └── backend/
├── infra/
├── packages/shared/
├── docs/
├── scripts/
└── docker-compose.yml
```

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) is the contributor workflow guide. It covers setup paths, validation commands, code standards, and the exact files to edit for translations, glossary content, demo text, and public JSON content.

## License

Non-commercial. Copyright (c) 2026 Amgad Mahmoud. See [LICENSE](LICENSE).
