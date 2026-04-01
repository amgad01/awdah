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
 * Vite discovers language JSON files in this folder at build time and imports
 * them eagerly so the production build stays warning-free.
 */
const allLanguageModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './[a-z][a-z].json',
  {
    eager: true,
    import: 'default',
  },
);

/**
 * Loads a translation bundle for the given language code.
 */
export async function loadLanguageBundle(code: string): Promise<Record<string, unknown>> {
  const bundle = allLanguageModules[`./${code}.json`];
  if (!bundle) {
    throw new Error(`No translation file found for language: ${code}`);
  }
  return bundle;
}
