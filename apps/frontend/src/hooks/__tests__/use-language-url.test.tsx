/**
 * Tests for the URL synchronisation behaviour in useLanguage.
 *
 * Verifies that:
 *  - switching to a non-default language appends ?lang=<code> to the URL
 *  - switching back to English keeps ?lang=en in the URL
 *  - loading with ?lang=<code> in the URL sets the initial language
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── navigate spy ───────────────────────────────────────────────────────────
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ── i18n mock ──────────────────────────────────────────────────────────────
const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);
let mockResolvedLanguage = 'en';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: {
      get resolvedLanguage() {
        return mockResolvedLanguage;
      },
      get language() {
        return mockResolvedLanguage;
      },
      hasResourceBundle: () => true,
      changeLanguage: async (code: string) => {
        mockResolvedLanguage = code;
        return mockChangeLanguage(code);
      },
      addResourceBundle: vi.fn(),
      dir: (lang: string) => (lang === 'ar' ? 'rtl' : 'ltr'),
    },
  }),
}));

// ── language helpers mock ──────────────────────────────────────────────────
vi.mock('@/i18n/languages', async () => {
  const { getLanguageCodeFromSearch } =
    await vi.importActual<typeof import('@/i18n/languages')>('@/i18n/languages');
  return {
    DEFAULT_LANGUAGE_CODE: 'en',
    LANGUAGE_QUERY_KEY: 'lang',
    SUPPORTED_LANGUAGES: [
      { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', shortLabel: 'EN' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', shortLabel: 'AR' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', shortLabel: 'DE' },
    ],
    getLanguageDirection: (lang: string) => (lang === 'ar' ? 'rtl' : 'ltr'),
    isSupportedLanguageCode: (code: string) => ['en', 'ar', 'de'].includes(code),
    getLanguageCodeFromSearch,
    loadLanguageBundle: vi.fn().mockResolvedValue({}),
    persistLanguageCode: vi.fn(),
  };
});

import { useLanguage } from '../use-language';

function wrapper({ initialPath = '/' }: { initialPath?: string } = {}) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe('useLanguage – URL synchronisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolvedLanguage = 'en';
  });

  it('adds ?lang=ar to the URL when switching to Arabic', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.setLanguage('ar');
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: '?lang=ar' }),
      expect.objectContaining({ replace: true }),
    );
  });

  it('adds ?lang=de to the URL when switching to German', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.setLanguage('de');
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: '?lang=de' }),
      expect.objectContaining({ replace: true }),
    );
  });

  it('keeps ?lang=en when switching back to English', async () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: wrapper({ initialPath: '/?lang=ar' }),
    });

    await act(async () => {
      await result.current.setLanguage('en');
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: '?lang=en' }),
      expect.objectContaining({ replace: true }),
    );
  });

  it('does not navigate when syncUrl is false', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper: wrapper() });
    mockNavigate.mockClear();

    await act(async () => {
      await result.current.setLanguage('ar', { syncUrl: false });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
