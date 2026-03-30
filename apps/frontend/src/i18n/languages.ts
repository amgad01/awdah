/**
 * Language manifest — the single place to register a new language.
 *
 * To add a new language:
 *   1. Drop `src/i18n/<code>.json` into this folder (matching the translation
 *      structure of en.json).
 *   2. Add an entry to languages.json in this same folder.
 *   No other code changes are needed — Vite discovers the JSON via import.meta.glob
 *   and the language switcher renders from this list automatically.
 */

import languagesData from './languages.json';

export interface LanguageDef {
  code: string;
  name: string; // English label, e.g. "Arabic"
  nativeName: string; // Full native label, e.g. "العربية"
  shortLabel: string; // Compact display label for the nav toggle, e.g. "ع"
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageDef[] = languagesData as LanguageDef[];

/**
 * Vite discovers non-core JSON files in this folder at build time and creates
 * lazy-loaded chunks for each. `en` and `ar` are bundled eagerly in `i18n/index.ts`
 * to avoid a flash on startup, so they are excluded here to keep the build clean.
 */
const allLanguageModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './!(en|ar).json',
);

/**
 * Loads a translation bundle for the given language code on demand.
 * `en` and `ar` are pre-bundled in `i18n/index.ts`, so this is only called for
 * languages added beyond those two.
 */
export async function loadLanguageBundle(code: string): Promise<Record<string, unknown>> {
  const loader = allLanguageModules[`./${code}.json`];
  if (!loader) {
    throw new Error(`No translation file found for language: ${code}`);
  }
  const mod = await loader();
  return mod.default;
}
