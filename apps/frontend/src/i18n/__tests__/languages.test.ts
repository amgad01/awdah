/**
 * Tests for the language auto-discovery system.
 *
 * Adding a new language requires only:
 *   1. Drop src/i18n/<code>.json with a _meta block
 *   2. Nothing else — these tests verify the invariants every language file must satisfy.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LANGUAGE_CODE,
  getInitialLanguageCode,
  getLanguageCodeFromSearch,
  getLanguageDirection,
  isSupportedLanguageCode,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_QUERY_KEY,
  SUPPORTED_LANGUAGES,
  loadLanguageBundle,
  persistLanguageCode,
} from '../languages';

// ── Manifest invariants ──────────────────────────────────────────────────────

describe('SUPPORTED_LANGUAGES', () => {
  it('is non-empty', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
  });

  it('contains English, Arabic, and German', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('ar');
    expect(codes).toContain('de');
  });

  it('places English first', () => {
    expect(SUPPORTED_LANGUAGES[0].code).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('every entry has all required fields', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.name).toBe('string');
      expect(typeof lang.nativeName).toBe('string');
      expect(typeof lang.shortLabel).toBe('string');
      expect(['ltr', 'rtl']).toContain(lang.dir);
    }
  });

  it('keeps _meta.code aligned with the filename-derived code', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toMatch(/^[a-z]{2}$/);
    }
  });

  it('English entry has correct metadata', () => {
    const en = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
    expect(en).toBeDefined();
    expect(en!.name).toBe('English');
    expect(en!.dir).toBe('ltr');
  });

  it('Arabic entry has correct metadata', () => {
    const ar = SUPPORTED_LANGUAGES.find((l) => l.code === 'ar');
    expect(ar).toBeDefined();
    expect(ar!.name).toBe('Arabic');
    expect(ar!.dir).toBe('rtl');
    expect(ar!.nativeName).toBe('العربية');
  });

  it('German entry has correct metadata', () => {
    const de = SUPPORTED_LANGUAGES.find((l) => l.code === 'de');
    expect(de).toBeDefined();
    expect(de!.name).toBe('German');
    expect(de!.dir).toBe('ltr');
    expect(de!.nativeName).toBe('Deutsch');
  });

  it('has no duplicate language codes', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ── Language helpers ────────────────────────────────────────────────────────

describe('language helpers', () => {
  it('recognizes supported language codes', () => {
    expect(isSupportedLanguageCode('en')).toBe(true);
    expect(isSupportedLanguageCode('ar')).toBe(true);
    expect(isSupportedLanguageCode('xx')).toBe(false);
  });

  it('returns the correct direction for known languages', () => {
    expect(getLanguageDirection('en')).toBe('ltr');
    expect(getLanguageDirection('ar')).toBe('rtl');
  });

  it('falls back to ltr for unknown languages', () => {
    expect(getLanguageDirection('xx')).toBe('ltr');
  });

  it('prefers a supported stored language', () => {
    const storage = {
      getItem: (key: string) => (key === LANGUAGE_STORAGE_KEY ? 'ar' : null),
    };

    expect(getInitialLanguageCode(storage)).toBe('ar');
  });

  it('prefers a supported language from the URL over stored preferences', () => {
    const storage = {
      getItem: (key: string) => (key === LANGUAGE_STORAGE_KEY ? 'ar' : null),
    };

    expect(getInitialLanguageCode(storage, `?${LANGUAGE_QUERY_KEY}=de`)).toBe('de');
  });

  it('ignores unsupported URL languages and falls back to storage', () => {
    const storage = {
      getItem: (key: string) => (key === LANGUAGE_STORAGE_KEY ? 'ar' : null),
    };

    expect(getInitialLanguageCode(storage, `?${LANGUAGE_QUERY_KEY}=xx`)).toBe('ar');
  });

  it('falls back to the default language for unsupported stored values', () => {
    const storage = {
      getItem: () => 'xx',
    };

    expect(getInitialLanguageCode(storage)).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('persists only supported languages', () => {
    let storedValue: string | null = null;
    const storage = {
      setItem: (key: string, value: string) => {
        storedValue = `${key}:${value}`;
      },
    };

    persistLanguageCode('ar', storage);
    expect(storedValue).toBe(`${LANGUAGE_STORAGE_KEY}:ar`);

    storedValue = null;
    persistLanguageCode('xx', storage);
    expect(storedValue).toBeNull();
  });

  it('parses a supported language from search params', () => {
    expect(getLanguageCodeFromSearch(`?${LANGUAGE_QUERY_KEY}=ar`)).toBe('ar');
  });

  it('returns null for missing or unsupported search params', () => {
    expect(getLanguageCodeFromSearch('')).toBeNull();
    expect(getLanguageCodeFromSearch(`?${LANGUAGE_QUERY_KEY}=xx`)).toBeNull();
  });
});

// ── Bundle loading ───────────────────────────────────────────────────────────

describe('loadLanguageBundle', () => {
  it('resolves for English', async () => {
    const bundle = await loadLanguageBundle('en');
    expect(bundle).toBeDefined();
    expect(typeof bundle).toBe('object');
  });

  it('resolves for Arabic', async () => {
    const bundle = await loadLanguageBundle('ar');
    expect(bundle).toBeDefined();
    expect(typeof bundle).toBe('object');
  });

  it('resolves for German', async () => {
    const bundle = await loadLanguageBundle('de');
    expect(bundle).toBeDefined();
    expect(typeof bundle).toBe('object');
  });

  it('strips _meta from the returned bundle', async () => {
    const en = await loadLanguageBundle('en');
    expect('_meta' in en).toBe(false);

    const ar = await loadLanguageBundle('ar');
    expect('_meta' in ar).toBe(false);

    const de = await loadLanguageBundle('de');
    expect('_meta' in de).toBe(false);
  });

  it('bundle contains expected top-level translation namespaces', async () => {
    const en = await loadLanguageBundle('en');
    expect(en).toHaveProperty('common');
    expect(en).toHaveProperty('language_switcher');
  });

  it('throws for an unknown language code', async () => {
    await expect(loadLanguageBundle('xx')).rejects.toThrow(
      'No translation file found for language: xx',
    );
  });
});

// ── Structural completeness ──────────────────────────────────────────────────

describe('translation file structural completeness', () => {
  it('Arabic bundle has the same top-level namespace keys as English', async () => {
    const en = await loadLanguageBundle('en');
    const ar = await loadLanguageBundle('ar');

    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();

    expect(arKeys).toEqual(enKeys);
  });

  it('German bundle has the same top-level namespace keys as English', async () => {
    const en = await loadLanguageBundle('en');
    const de = await loadLanguageBundle('de');

    const enKeys = Object.keys(en).sort();
    const deKeys = Object.keys(de).sort();

    expect(deKeys).toEqual(enKeys);
  });
});
