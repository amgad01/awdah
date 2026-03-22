import { useTranslation } from 'react-i18next';
import { useEffect, useCallback } from 'react';
import { formatNumber, formatPercent } from '@/utils/format';

export const useLanguage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const fmtNumber = useCallback((n: number) => formatNumber(n, i18n.language), [i18n.language]);

  const fmtPercent = useCallback((n: number) => formatPercent(n, i18n.language), [i18n.language]);

  return {
    t,
    language: i18n.language,
    isRTL,
    toggleLanguage,
    fmtNumber,
    fmtPercent,
  };
};
