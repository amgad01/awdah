import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/use-language';
import styles from './language-switcher.module.css';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'full';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'compact' }) => {
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const isArabic = language === 'ar';

  if (variant === 'full') {
    return (
      <button
        className={styles.fullBtn}
        onClick={toggleLanguage}
        aria-label={
          isArabic
            ? t('language_switcher.switch_to_english')
            : t('language_switcher.switch_to_arabic')
        }
        type="button"
      >
        <span className={styles.fullLabel}>
          {isArabic ? t('language_switcher.english') : t('language_switcher.arabic')}
        </span>
      </button>
    );
  }

  return (
    <button
      className={styles.switcher}
      onClick={toggleLanguage}
      aria-label={
        isArabic
          ? t('language_switcher.switch_to_english')
          : t('language_switcher.switch_to_arabic')
      }
      type="button"
    >
      <span className={isArabic ? styles.inactive : styles.active}>EN</span>
      <span className={styles.divider} aria-hidden="true">
        |
      </span>
      <span className={isArabic ? styles.active : styles.inactive}>ع</span>
    </button>
  );
};
