import { GENERATED_LANGUAGE_MANIFEST } from './language-manifest.generated';

export interface LanguageDef {
  code: string;
  name: string; // English label, e.g. "Arabic"
  nativeName: string; // Full native label, e.g. "العربية"
  shortLabel: string; // Compact display label for the nav toggle, e.g. "ع"
  dir: 'ltr' | 'rtl';
}

type TranslationBundle = Record<string, unknown>;

export const DEFAULT_LANGUAGE_CODE = 'en';
export const LANGUAGE_STORAGE_KEY = 'language';
export const LANGUAGE_QUERY_KEY = 'lang';

// Full translation bundles stay lazy so each locale can split into its own chunk.
const allLanguageBundleLoaders = import.meta.glob<TranslationBundle>('./[a-z][a-z].json', {
  import: 'default',
});

function sortLanguages(languages: LanguageDef[]): LanguageDef[] {
  return [...languages].sort((a, b) =>
    a.code === DEFAULT_LANGUAGE_CODE
      ? -1
      : b.code === DEFAULT_LANGUAGE_CODE
        ? 1
        : a.name.localeCompare(b.name),
  );
}

export const SUPPORTED_LANGUAGES: LanguageDef[] = sortLanguages(GENERATED_LANGUAGE_MANIFEST);

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
 *
 * Languages must be present at build time in src/i18n/ to be available.
 */
export async function loadLanguageBundle(code: string): Promise<TranslationBundle> {
  const bundledLoader = allLanguageBundleLoaders[`./${code}.json`];
  if (bundledLoader != null) {
    const bundle = await bundledLoader();
    return omitMeta(bundle);
  }

  throw new Error('common.language_not_available');
}
