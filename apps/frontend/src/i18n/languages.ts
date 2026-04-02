/**
 * Language manifest — auto-derived from translation files.
 *
 * To add a new language:
 *   1. Drop `src/i18n/<code>.json` into this folder, matching the translation
 *      structure of en.json, with a top-level "_meta" object:
 *
 *        {
 *          "_meta": {
 *            "code": "fr",
 *            "name": "French",
 *            "nativeName": "Français",
 *            "shortLabel": "FR",
 *            "dir": "ltr"
 *          },
 *          "common": { ... },
 *          ...
 *        }
 *
 *   No other code changes are needed. Vite discovers the file via import.meta.glob,
 *   reads _meta, and the language switcher renders it automatically.
 */

export interface LanguageDef {
  code: string;
  name: string; // English label, e.g. "Arabic"
  nativeName: string; // Full native label, e.g. "العربية"
  shortLabel: string; // Compact display label for the nav toggle, e.g. "ع"
  dir: 'ltr' | 'rtl';
}

type LanguageMeta = LanguageDef;
type TranslationBundle = Record<string, unknown>;

export const DEFAULT_LANGUAGE_CODE = 'en';
export const LANGUAGE_STORAGE_KEY = 'language';
export const LANGUAGE_QUERY_KEY = 'lang';

// Language metadata is eager so the switcher can render immediately.
const allLanguageMetadata = import.meta.glob<LanguageMeta>('./[a-z][a-z].json', {
  eager: true,
  import: '_meta',
});

// Full translation bundles stay lazy so adding new languages does not grow the
// initial app chunk unnecessarily.
const allLanguageBundleLoaders = import.meta.glob<TranslationBundle>('./[a-z][a-z].json', {
  import: 'default',
});

function isValidMeta(value: unknown): value is LanguageMeta {
  if (value == null || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m['code'] === 'string' &&
    typeof m['name'] === 'string' &&
    typeof m['nativeName'] === 'string' &&
    typeof m['shortLabel'] === 'string' &&
    (m['dir'] === 'ltr' || m['dir'] === 'rtl')
  );
}

function toLanguageDef(filePath: string, meta: unknown): LanguageDef {
  const fileCode = filePath.slice(2, -5); // './en.json' → 'en'

  if (!isValidMeta(meta)) {
    throw new Error(`Invalid or missing _meta in translation file: ${filePath}`);
  }

  if (meta.code !== fileCode) {
    throw new Error(
      `Translation file ${filePath} has mismatched _meta.code '${meta.code}' (expected '${fileCode}')`,
    );
  }

  return {
    code: fileCode,
    name: meta.name,
    nativeName: meta.nativeName,
    shortLabel: meta.shortLabel,
    dir: meta.dir,
  };
}

/**
 * SUPPORTED_LANGUAGES is built at import time from the _meta block of every
 * discovered translation JSON. English is always sorted first; all other
 * languages follow in alphabetical order by their English name.
 */
export const SUPPORTED_LANGUAGES: LanguageDef[] = Object.entries(allLanguageMetadata)
  .map(([filePath, meta]) => toLanguageDef(filePath, meta))
  .sort((a, b) =>
    a.code === DEFAULT_LANGUAGE_CODE
      ? -1
      : b.code === DEFAULT_LANGUAGE_CODE
        ? 1
        : a.name.localeCompare(b.name),
  );

const supportedLanguageMap = new Map(
  SUPPORTED_LANGUAGES.map((language) => [language.code, language]),
);

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function getBrowserSearch(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.search;
}

function omitMeta(bundle: TranslationBundle): TranslationBundle {
  const { _meta: _, ...translations } = bundle;
  return translations;
}

export function isSupportedLanguageCode(code: string): boolean {
  return supportedLanguageMap.has(code);
}

export function getLanguageDirection(code: string): LanguageDef['dir'] {
  return supportedLanguageMap.get(code)?.dir ?? 'ltr';
}

export function getLanguageCodeFromSearch(search: string = getBrowserSearch()): string | null {
  if (!search) {
    return null;
  }

  const params = new URLSearchParams(search);
  const code = params.get(LANGUAGE_QUERY_KEY);

  return code != null && isSupportedLanguageCode(code) ? code : null;
}

export function getStoredLanguageCode(
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
): string | null {
  const code = storage?.getItem(LANGUAGE_STORAGE_KEY);
  return code != null && isSupportedLanguageCode(code) ? code : null;
}

export function getInitialLanguageCode(
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
  search: string = getBrowserSearch(),
): string {
  return (
    getLanguageCodeFromSearch(search) ?? getStoredLanguageCode(storage) ?? DEFAULT_LANGUAGE_CODE
  );
}

export function persistLanguageCode(
  code: string,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
): void {
  if (storage == null || !isSupportedLanguageCode(code)) {
    return;
  }

  storage.setItem(LANGUAGE_STORAGE_KEY, code);
}

/**
 * Returns the translation bundle for the given language code, with the
 * internal _meta block stripped so it never pollutes the i18n namespace.
 */
export async function loadLanguageBundle(code: string): Promise<TranslationBundle> {
  const loader = allLanguageBundleLoaders[`./${code}.json`];
  if (loader == null) {
    throw new Error(`No translation file found for language: ${code}`);
  }

  const bundle = await loader();
  return omitMeta(bundle);
}
