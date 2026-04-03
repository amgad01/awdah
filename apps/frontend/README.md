# Awdah — Frontend

React 19 SPA with TypeScript, Vite, CSS Modules, and full Arabic RTL support.

## Features

| Area        | Stack                                               |
| ----------- | --------------------------------------------------- |
| UI          | React 19, CSS Modules, Framer Motion                |
| State       | TanStack Query (server), React hooks (local)        |
| i18n / RTL  | i18next, react-i18next — dynamic multilingual + RTL |
| Routing     | React Router v7                                     |
| Charts      | Recharts                                            |
| Icons       | Lucide React                                        |
| E2E Testing | Playwright                                          |

## Project Structure

```
src/
├── features/           # Feature modules (auth, dashboard, history, salah, sawm, settings, learn)
├── components/         # Shared UI components (card, progress, nav, language-switcher)
├── hooks/              # Custom hooks (use-auth, use-language, use-worship, use-dual-date)
├── contexts/           # Shared React context providers (auth)
├── i18n/               # i18next config + translation files
├── content/            # Static content (FAQ data, scholar references)
├── lib/                # Env validation, utilities
├── utils/              # Formatters (fmtNumber, date-utils)
└── main.tsx            # App entry point
```

## Scripts

```bash
npm run dev              # Vite dev server (http://localhost:5173)
npm run build            # TypeScript check + Vite production build
npm run typecheck        # TypeScript only
npm run lint             # ESLint
npm run preview          # Preview production build locally
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright interactive UI mode
```

## Environment Variables

| Variable                    | Description                                                                                                                   | Required     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `VITE_API_BASE_URL`         | Backend API URL. Leave empty for same-origin `/v1/*`.                                                                         | Optional     |
| `VITE_AUTH_MODE`            | `cognito` / `local`                                                                                                           | Yes          |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID                                                                                                          | Cognito mode |
| `VITE_COGNITO_CLIENT_ID`    | Cognito Client ID                                                                                                             | Cognito mode |
| `VITE_AWS_REGION`           | AWS region                                                                                                                    | Cognito mode |
| `VITE_BASE_PATH`            | Vite `base` path. Set to `/awdah/` for GitHub Pages, leave unset (defaults to `/`) for CloudFront or same-origin deployments. | Optional     |
| `VITE_APP_EMAIL`            | Support email address for privacy and contact.                                                                                | Optional     |

In local dev mode (`VITE_AUTH_MODE=local`), the Vite dev server proxies `/v1` and `/health` to `http://localhost:3000`. No Cognito is required, but the backend and LocalStack still need to be running for data-backed flows.

In deployed environments, Pages production uses `VITE_BASE_PATH=/awdah/` and a direct API base URL, while CloudFront-style deployments typically keep `VITE_BASE_PATH=/`. The shipped HTML includes a meta CSP/referrer policy for static hosts such as GitHub Pages, while CloudFront or nginx deployments can add stronger response headers at the edge.

## Static Demo Route

- Route: `/demo`
- Data source: `public/demo-data/sample-user.json`

The demo route is a public, JSON-backed sample account meant for portfolio links, and non-AWS static deployments. It does not require live API data, Cognito, or AWS infrastructure to render.

## RTL and i18n

All CSS uses logical properties (`margin-inline-start`, `padding-inline-end`). The `dir` attribute on `<html>` toggles RTL/LTR based on selected language. All display strings are externalised into `src/i18n/en.json` and `src/i18n/ar.json`.

## Design Tokens

New components should use the centralized palette and shadow tokens in `src/assets/globals.css` instead of hardcoding colors in component CSS. See [docs/design-tokens.md](docs/design-tokens.md) for the component authoring guide.

## E2E Tests

Tests live in `e2e/` and run against the local frontend dev server in `VITE_AUTH_MODE=local`, with the backend on `http://localhost:3000` and LocalStack providing DynamoDB.

The Playwright backend helper starts LocalStack automatically when it is missing, then waits for it to become healthy before seeding data. If Docker is unavailable, it fails with a clear message.

```bash
npm run test:e2e         # Headless
npm run test:e2e:ui      # Interactive
```
