# Awdah Frontend

The frontend is a React 19 SPA built with Vite, TypeScript, CSS Modules, and i18next. It serves both the authenticated app and the public routes (`/about`, `/learn`, `/contribute`, `/demo`).

## Current Responsibilities

| Area           | Implementation                                      |
| -------------- | --------------------------------------------------- |
| Routing        | React Router v7                                     |
| Server state   | TanStack Query                                      |
| Local UI state | feature hooks and context providers                 |
| i18n           | Arabic, English, and German                         |
| RTL            | driven by the active language via `dir` on `<html>` |
| Charts         | Recharts                                            |
| Motion         | Framer Motion                                       |
| E2E            | Playwright                                          |

## Source Layout

```text
src/
├── features/       # Route and feature modules
├── components/     # Shared UI primitives and layout
├── hooks/          # Feature-independent React hooks
├── contexts/       # Shared providers
├── i18n/           # Locale bundles and language metadata
├── content/        # Glossary and reference content
├── lib/            # API client, env validation, auth services
├── utils/          # Formatting and helper utilities
└── main.tsx        # Bootstrap
```

## Public Content Model

The frontend consumes two kinds of localized content:

- bundled UI translations in `src/i18n/*.json`
- runtime-fetched public content in `public/data/*.json`

Runtime-fetched public content currently covers:

- About page
- Contributing page
- FAQ/Learn page

Those files are loaded with English fallback merging, so partial translations can ship safely. The loader also reuses in-memory requests for identical files so language switches and dev remounts do not refetch the English fallback repeatedly.

Glossary annotations are separate from both translation bundles and page JSON. They live in:

- `src/content/glossary/glossary.json`

## Demo Route

- Route: `/demo`
- Data source: `public/demo-data/sample-user.json`

The demo page is intentionally static-data driven so it can render on ordinary static hosting without backend infrastructure.

## Local Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:e2e:chromium
```

From the repo root, the common equivalents are:

```bash
npm run dev:frontend
npm run test:e2e
npm run check:pages
```

## Environment Variables

| Variable                    | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `VITE_AUTH_MODE`            | `local` or `cognito`                                |
| `VITE_API_BASE_URL`         | Explicit backend URL; otherwise same-origin `/v1/*` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito pool ID for AWS-backed auth                 |
| `VITE_COGNITO_CLIENT_ID`    | Cognito app client                                  |
| `VITE_AWS_REGION`           | AWS region for Cognito-backed auth                  |
| `VITE_BASE_PATH`            | Build base path, `/awdah/` for GitHub Pages         |
| `VITE_APP_EMAIL`            | Public contact/support address                      |

In cloudless local work you normally only need `VITE_AUTH_MODE=local`.

## Frontend Constraints

- Keep display copy in translations or runtime JSON, not in components.
- Use logical CSS properties so RTL stays correct.
- Prefer shared UI primitives and design tokens over ad hoc styles.
- If you add or change an API route, update `docs/api/openapi.yaml`.

## Related Docs

- [../../README.md](../../README.md)
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [docs/design-tokens.md](docs/design-tokens.md)
