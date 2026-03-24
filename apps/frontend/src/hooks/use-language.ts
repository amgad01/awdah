import { useTranslation } from 'react-i18next';
import { useEffect, useCallback } from 'react';
import { formatNumber, formatPercent } from '@/utils/format';
import { SUPPORTED_LANGUAGES, loadLanguageBundle } from '@/i18n/languages';

export const useLanguage = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isRTL = (SUPPORTED_LANGUAGES.find((l) => l.code === language)?.dir ?? 'ltr') === 'rtl';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  /**
   * Switch to any supported language. If the bundle hasn't been loaded yet
   * (i.e. a language added beyond the pre-bundled en/ar), it is fetched
   * on demand from the Vite-generated chunk before the language changes.
   */
  const setLanguage = useCallback(
    async (code: string) => {
      if (!i18n.hasResourceBundle(code, 'translation')) {
        const resource = await loadLanguageBundle(code);
        i18n.addResourceBundle(code, 'translation', resource, true, true);
      }
      await i18n.changeLanguage(code);
      localStorage.setItem('language', code);
    },
    [i18n],
  );

  const toggleLanguage = useCallback(() => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const idx = codes.indexOf(language);
    const next = codes[(idx + 1) % codes.length];
    setLanguage(next);
  }, [language, setLanguage]);

  const fmtNumber = useCallback((n: number) => formatNumber(n, language), [language]);

  const fmtPercent = useCallback((n: number) => formatPercent(n, language), [language]);

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
