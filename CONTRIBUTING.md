# Contributing to Awdah

Awdah is a public source-available repository. Contributions are welcome: code, translations, scholarly review, or catching a bug. All collaboration remains subject to the repository license.

For areas where help is most needed and the v2 roadmap, see the [/contribute](https://amgad01.github.io/awdah/contribute) page in the app. It covers what areas need work, how to submit a PR, and what is planned next.

---

## Before You Start

If this is your first contribution, choose the lightest lane that fits your change:

- Content, docs, translations, and public-page copy: frontend-only is usually enough
- Dashboard, tracker, settings, auth, or API work: use the full local app setup
- Deploy, routing, `index.html`, or GitHub Pages changes: also run the Pages build check

You do not need a real AWS account for normal contribution work.

## Local development

### Prerequisites

- Node.js (version in `.nvmrc`)
- Docker (for LocalStack)
- AWS CLI (optional, for direct LocalStack inspection)

### Setup

### 1. Frontend-only path

Use this for:

- `README.md`, `CONTRIBUTING.md`, and docs
- translation files under `apps/frontend/src/i18n/`
- static page content under `apps/frontend/public/data/`
- UI work on public routes such as `/learn`, `/about`, `/contribute`, and `/demo`

```bash
# Clone and install
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install

# Start the frontend
npm run dev:frontend
```

### 2. Full local app path

Use this when your change needs login, tracker data, settings, API routes, or LocalStack-backed behavior.

```bash
# Clone and install
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install

# Start LocalStack (simulates DynamoDB, S3, SQS, Cognito, etc.)
docker compose up -d localstack

# Start the dev servers in separate terminals
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # Lambda runner on http://localhost:3000
```

Copy `.env.example` to `.env.local` — LocalStack doesn't need real credentials:

```bash
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=eu-west-1
LOCALSTACK_ENDPOINT=http://localhost:4566
```

### Running checks

```bash
npm run check:quick   # Fast repo gate: shared build + lint + format check + typecheck
npm run check         # Full repo gate: builds, tests, and audit
npm run check:pages   # Builds the frontend with /awdah/ and verifies the Pages output
```

The Husky pre-push hook runs the full gate plus frontend Playwright E2E, so LocalStack must be running before you push. If you want the faster path while iterating, use `npm run check:quick`.

Pre-commit hooks run lint and a quick typecheck automatically.

---

## How to submit a PR

1. Fork `amgad01/awdah` on GitHub and clone your fork
2. Create a branch: `git checkout -b feat/your-change` (use `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, or `infra/`)
3. Make your changes — see the code standards section below
4. Run `npm run check:quick` and fix any failures
5. Commit using Conventional Commits: `git commit -m "feat: add French translation"`
6. Push and open a PR against `main`
7. CI runs automatically — the PR needs to be green before merge

For religious content changes, include the scholarly source in your commit message or PR description.

---

## Code standards

- No `console.log` - use the structured logger in the backend
- No hardcoded display strings in components - all copy goes through the translation layer (`t('key')`)
- No directional CSS properties (`margin-left`, `padding-right`) - use logical properties only (`margin-inline-start`, `padding-inline-end`)
- No raw `any` types
- All API route changes must be reflected in `docs/api/openapi.yaml`
- All dates are Hijri `YYYY-MM-DD` - Gregorian conversion only at the API boundary

---

## Updating content without code changes

Most of the app's public-facing content lives in JSON files under `apps/frontend/public/data/`. These files are fetched at runtime, so you can update them by editing the JSON, committing, and letting the deploy pipeline run — no TypeScript changes needed.

For current work areas, roadmap items, and the contributor-facing project board, use the hosted [/contribute](https://amgad01.github.io/awdah/contribute) page. This file stays focused on contribution workflow and repo mechanics.

### Add a contributor to the About page

Edit `apps/frontend/public/data/about-en.json` and `about-ar.json`. Add an entry to the `contributors` array at the end of each file:

```json
{
  "id": "github-username",
  "name": "Your Name",
  "github": "github-username",
  "role": "Frontend",
  "contribution_summary": "What you contributed — one sentence is enough"
}
```

Commit the two files and open a PR. Once merged and deployed, your entry appears on the About page.

### Update the FAQ

Edit `apps/frontend/public/data/faq-en.json`, `faq-ar.json`, and `faq-de.json`. Each entry in the `items` array has an `id`, `question`, `answer`, and optional `references` array. Add to the relevant section or add a new section if needed. The FAQ page fetches the file fresh on each load, so there is no cache to clear.

### Update the Contributing page sections

The Contributing page content (areas of work, PR guide, v2 roadmap) lives in `apps/frontend/public/data/contributing-en.json`, `contributing-ar.json`, and `contributing-de.json`. Edit the text directly – sections, items, and steps are all plain strings. No component changes are needed.

### Add a new UI language

Adding a new language to the app requires changes in two separate places: the i18n translation bundle and the public data files.

Important boundary:

- Only files in `apps/frontend/src/i18n/` use the `_meta` key.
- Files in `apps/frontend/public/data/` do not use `_meta` and should keep their existing content-only schema.
- Today, the built-in translation bundles are `en.json`, `ar.json`and `de.json`, but the system is designed to scale to more languages without code changes.

#### 1. i18n translation bundle

Each language is a single JSON file. The file is self-describing — the language switcher discovers it automatically, so no registration step is needed.

1. Copy `apps/frontend/src/i18n/en.json` and name it with the ISO 639-1 code (e.g. `fr.json` for French, `tr.json` for Turkish, `ur.json` for Urdu)
2. Translate all string values — do not change keys, and keep `{{variable}}` placeholders exactly as they are
3. At the end of the file, add a `_meta` block:
   ```json
   "_meta": {
     "code": "fr",
     "name": "French",
     "nativeName": "Français",
     "shortLabel": "FR",
     "dir": "ltr"
   }
   ```
   For a right-to-left language like Urdu, use `"dir": "rtl"`. That is all the registration needed — the language switcher picks up the file automatically.

#### 2. Public data files

The About, FAQ, and Contributing pages load their content from `apps/frontend/public/data/`. These files are independent of the i18n system and need to be translated separately.

1. Copy each `*-en.json` file to a `*-<code>.json` variant and translate all string values:

- `apps/frontend/public/data/about-en.json` → `apps/frontend/public/data/about-fr.json`
- `apps/frontend/public/data/contributing-en.json` → `apps/frontend/public/data/contributing-fr.json`
- `apps/frontend/public/data/faq-en.json` → `apps/frontend/public/data/faq-fr.json`
- Keep the same content-only schema. Do not add `_meta` to these files.

2. If a language is only partially translated, the UI falls back to English for missing public content.

#### 3. Glossary terms, references, and tooltips

The glossary in `apps/frontend/src/content/glossary/glossary.json` powers the term tooltips used in onboarding and other educational copy. It is separate from the translation bundles, but it still needs language-specific text if you want the terms to read naturally in a new language.

1. Review the glossary terms that appear in translated screens, especially onboarding and qadaa guidance copy.
2. Add your language code to any glossary entry that should have native synonyms, definitions, or source references.
3. If you introduce new scholarly links, add them under `apps/frontend/src/content/references/` and render them through the reference list component.
4. Verify the tooltip copy in the app in both LTR and RTL if applicable.

Glossary entries fall back to English when a language key is missing, so adding the new language is optional for basic functionality but required for a fully polished rollout.

#### 4. Full language support checklist

To ship a new language end-to-end, add all of the following:

- `apps/frontend/src/i18n/<code>.json` with the translated UI copy and a valid `_meta` block
- `apps/frontend/public/data/about-<code>.json`
- `apps/frontend/public/data/contributing-<code>.json`
- `apps/frontend/public/data/faq-<code>.json`
- `apps/frontend/src/content/glossary/glossary.json` entries for any terms that should have native tooltip text or references
- `apps/frontend/src/content/references/` entries for any new scholarly sources you want to surface in the UI
- `apps/frontend/public/demo-data/sample-user.json` with `user.story.<code>` for the demo route

If the language is right-to-left, set `_meta.dir` to `rtl` and verify the UI in both LTR and RTL contexts.

#### 5. Verify

1. Run `npm run dev:frontend` — the language switcher will show your new language immediately
2. Go through the app in your new language and check for anything that looks wrong in context
3. Run `npm run test --workspace=apps/frontend` and `npm run check:quick`, then open a PR

RTL layout switches automatically based on the `dir` value in `_meta` — no component changes are needed.

---

## Contributor recognition

Everyone with a merged PR is listed in the README and on the About page with their name, GitHub profile, and a description of what they contributed. Translation contributors and scholar reviewers are credited by name and role.

After your PR is merged, open a second small PR updating `apps/frontend/public/data/about-en.json` and `about-ar.json` to add yourself to the contributors array (see the section above). If you'd prefer not to update it yourself, a maintainer can do it for you — just ask.

---

If you have questions, reach out on [LinkedIn](https://www.linkedin.com/in/amgad-m) or open an issue on GitHub.
