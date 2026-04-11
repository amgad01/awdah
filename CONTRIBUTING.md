# Contributing to Awdah

Awdah is source-available and open to contributions. Useful changes include product code, docs, translations, public educational content, accessibility fixes, tests, and technical review. Contributions remain subject to the repository license.

For the current public work areas and roadmap, use the live [/contribute](https://amgad01.github.io/awdah/contribute) page. This file stays focused on repo workflow and editing guidance.

## Choose The Lightest Setup

You do not need AWS for most work.

| If you are changing...                                                                 | Use this setup       |
| -------------------------------------------------------------------------------------- | -------------------- |
| Docs, translations, glossary copy, `/about`, `/learn`, `/contribute`, `/demo`, styling | Cloudless frontend   |
| Authenticated UI, API flows, settings, tracker/history behavior                        | LocalStack + backend |
| CDK, deploy scripts, release workflow, real AWS behavior                               | AWS-backed dev       |

### Cloudless frontend

```bash
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install
npm run dev:local
npm run dev:frontend
```

This enables local auth mode in `apps/frontend/.env.local`. You can sign in with any email and password and work on public routes without backend infrastructure.

### Full local app

```bash
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install
npm run docker:up
npm run dev:backend
npm run dev:frontend
```

If you specifically need CDK resources deployed into LocalStack, run:

```bash
./scripts/deploy/deploy-localstack.sh data
./scripts/deploy/deploy-localstack.sh auth
./scripts/deploy/deploy-localstack.sh api
```

### AWS-backed dev

```bash
./scripts/deploy/check-aws-session.sh
npm run deploy:all:dev
```

## Before You Open A PR

Run the most useful validation set for your change:

```bash
npm run check:quick
npm run check
npm run check:pages
```

Guidance:

- `check:quick` is the normal pre-PR gate.
- `check` mirrors the broader CI quality/build/audit flow.
- `check:pages` matters for routing, base-path, deploy config, `index.html`, or `404.html` work.
- `npm run test:e2e` is worth running for auth, history, tracker, settings, and public-route behavior changes.

## Pull Request Flow

1. Fork `amgad01/awdah` and clone your fork.
2. Create a branch such as `feat/...`, `fix/...`, `docs/...`, `refactor/...`, `test/...`, or `infra/...`.
3. Make your changes.
4. Run the relevant checks.
5. Use a conventional commit message such as `feat: add german faq entry` or `docs: tighten deployment guide`.
6. Open a PR against `main`.

If you change religious content, include the scholarly source in the PR description.

## What To Edit

### UI translations

Edit:

- `apps/frontend/src/i18n/en.json`
- `apps/frontend/src/i18n/ar.json`
- `apps/frontend/src/i18n/de.json`

Notes:

- Only `src/i18n/*.json` files carry `_meta` and participate in language discovery.
- `apps/frontend/src/i18n/language-manifest.generated.ts` is generated. Do not edit it by hand.

### Public page content

Edit the runtime-loaded JSON files under `apps/frontend/public/data/`:

- `about-en.json`, `about-ar.json`, `about-de.json`
- `contributing-en.json`, `contributing-ar.json`, `contributing-de.json`
- `faq-en.json`, `faq-ar.json`, `faq-de.json`

The frontend merges localized files over the English fallback at runtime, so missing localized fields fall back to English instead of blanking the page.

### Glossary tooltips

Edit:

- `apps/frontend/src/content/glossary/glossary.json`

That file drives glossary term detection and tooltip content. If you introduce a new Islamic term in public copy and want it annotated consistently, add it there.

### Demo content

Edit:

- `apps/frontend/public/demo-data/sample-user.json`

That file powers the public `/demo` route, including the localized sample-user story text.

### API changes

If you add or change an API route, also update:

- `docs/api/openapi.yaml`

## Code Standards

- Keep display copy in translation files or public JSON, not inline component strings.
- Use logical CSS properties (`margin-inline-start`, not `margin-left`).
- Avoid raw `any`.
- Preserve RTL behavior where applicable.
- Keep backend route handlers thin; business rules belong in use cases and domain logic.
- Do not hand-edit generated artifacts unless the file explicitly says otherwise.

## Useful Pointers

- Public architecture docs: [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [docs/architecture/overview.md](docs/architecture/overview.md)
- Release and workflow internals: [docs/github-actions-architecture.md](docs/github-actions-architecture.md)
- Script inventory: [scripts/README.md](scripts/README.md)

## Good First Contribution Areas

- Tighten docs that drifted from the code
- Improve public copy in `apps/frontend/public/data/`
- Add or correct glossary terms and references
- Add tests around a bug fix
- Improve mobile/RTL edge cases on public pages
- Update OpenAPI documentation when backend behavior changes

If you have questions, reach out on [LinkedIn](https://www.linkedin.com/in/amgad-m) or open an issue on GitHub.
