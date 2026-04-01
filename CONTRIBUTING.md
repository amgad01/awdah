# Contributing to Awdah

Awdah is a public repository. Contributions are welcome — code, translations, scholarly review, or catching a bug — and all collaboration remains subject to the repository license.

For areas where help is most needed and the v2 roadmap, see the [/contribute](https://amgad01.github.io/awdah/contribute) page in the app — it covers what areas need work, how to submit a PR, and what is planned next.

---

## Local development

### Prerequisites

- Node.js (version in `.nvmrc`)
- Docker (for LocalStack)
- AWS CLI (optional, for direct LocalStack inspection)

### Setup

```bash
# Clone and install
git clone https://github.com/amgad01/awdah.git
cd awdah
npm install

# Start LocalStack (simulates DynamoDB, S3, SQS, Cognito, etc.)
docker compose up -d

# Start the dev servers
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
npm run check:quick   # Fast: lint + unit tests
npm run check         # Full: typecheck, audit, all tests
```

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

- No `console.log` — use the structured logger in the backend
- No hardcoded display strings in components — all copy goes through the translation layer (`t('key')`)
- No directional CSS properties (`margin-left`, `padding-right`) — use logical properties only (`margin-inline-start`, `padding-inline-end`)
- No raw `any` types
- All API route changes must be reflected in `docs/api/openapi.yaml`
- All dates are Hijri `YYYY-MM-DD` — Gregorian conversion only at the API boundary

---

## Updating content without code changes

Most of the app's public-facing content lives in JSON files under `apps/frontend/public/data/`. These files are fetched at runtime, so you can update them by editing the JSON, committing, and letting the deploy pipeline run — no TypeScript changes needed.

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

Edit `apps/frontend/public/data/faq-en.json` and `faq-ar.json`. Each entry in the `items` array has an `id`, `question`, and `answer`. Add to the relevant section or add a new section if needed. The FAQ page fetches the file fresh on each load, so there is no cache to clear.

### Update the Contributing page sections

The Contributing page content (areas of work, PR guide, v2 roadmap) lives in `apps/frontend/public/data/contributing-en.json` and `contributing-ar.json`. Edit the text directly — sections, items, and steps are all plain strings. No component changes are needed.

### Add a new UI language

Adding a new language to the app requires two things — one translation file and one config entry:

1. Copy `apps/frontend/src/i18n/en.json` and name it with your language code (e.g. `fr.json` for French, `tr.json` for Turkish, `ur.json` for Urdu)
2. Translate all string values in the new file — do not change the keys, and keep `{{variable}}` placeholders exactly as they are
3. Open `apps/frontend/src/i18n/languages.json` and add an entry for your language:
   ```json
   { "code": "fr", "name": "French", "nativeName": "Français", "shortLabel": "FR", "dir": "ltr" }
   ```
   For a right-to-left language like Urdu: `"dir": "rtl"`
4. Also translate the public data files: copy `apps/frontend/public/data/about-en.json` → `about-fr.json` (and similarly for `faq`, `contributing`)
5. Run `npm run dev:frontend` — the language switcher will show your new language immediately
6. Go through the app in your new language and fix anything that looks wrong in context
7. Run `npm run test` and fix any failures, then open a PR

The language switcher and RTL layout both update automatically from the config — no component code changes are needed.

---

## Contributor recognition

Everyone with a merged PR is listed in the README and on the About page with their name, GitHub profile, and a description of what they contributed. Translation contributors and scholar reviewers are credited by name and role.

After your PR is merged, open a second small PR updating `apps/frontend/public/data/about-en.json` and `about-ar.json` to add yourself to the contributors array (see the section above). If you'd prefer not to update it yourself, a maintainer can do it for you — just ask.

---

If you have questions, reach out on [LinkedIn](https://www.linkedin.com/in/amgad-m) or open an issue on GitHub.
