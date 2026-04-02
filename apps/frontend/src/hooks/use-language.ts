import { useTranslation } from 'react-i18next';
import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatNumber, formatPercent } from '@/utils/format';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_QUERY_KEY,
  getLanguageDirection,
  getLanguageCodeFromSearch,
  isSupportedLanguageCode,
  loadLanguageBundle,
  persistLanguageCode,
} from '@/i18n/languages';

export const useLanguage = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const isRTL = getLanguageDirection(language) === 'rtl';
  const location = useLocation();
  const navigate = useNavigate();

  const syncLanguageInUrl = useCallback(
    (code: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set(LANGUAGE_QUERY_KEY, code);

      const nextSearch = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  /**
   * Switch to any supported language. The bundle is fetched on demand from
   * the Vite-generated chunk before the language changes if needed.
   */
  const setLanguage = useCallback(
    async (code: string, options: { syncUrl?: boolean } = {}) => {
      if (!isSupportedLanguageCode(code)) {
        throw new Error(`Unsupported language: ${code}`);
      }

      if (!i18n.hasResourceBundle(code, 'translation')) {
        const resource = await loadLanguageBundle(code);
        i18n.addResourceBundle(code, 'translation', resource, true, true);
      }

      if (code !== language) {
        await i18n.changeLanguage(code);
      }

      persistLanguageCode(code);

      if (options.syncUrl !== false) {
        syncLanguageInUrl(code);
      }
    },
    [i18n, language, syncLanguageInUrl],
  );

  const toggleLanguage = useCallback(() => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const idx = codes.indexOf(language);
    const next = codes[(idx + 1) % codes.length];
    setLanguage(next);
  }, [language, setLanguage]);

  const fmtNumber = useCallback((n: number) => formatNumber(n, language), [language]);

  const fmtPercent = useCallback((n: number) => formatPercent(n, language), [language]);

  useEffect(() => {
    const urlLanguage = getLanguageCodeFromSearch(location.search);

    if (urlLanguage != null) {
      if (urlLanguage !== language) {
        void setLanguage(urlLanguage, { syncUrl: false });
      }
      return;
    }

    syncLanguageInUrl(language);
  }, [language, location.search, setLanguage, syncLanguageInUrl]);

  return {
    t,
    language,
    isRTL,
    setLanguage,
    toggleLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    fmtNumber,
    fmtPercent,
  };
};
