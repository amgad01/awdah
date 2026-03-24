import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import styles from './language-switcher.module.css';

type LanguageSwitcherProps = {
  variant?: 'compact' | 'full';
  tone?: 'default' | 'inverse';
};

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'compact',
  tone = 'default',
}) => {
  const { language, setLanguage, toggleLanguage, supportedLanguages, t } = useLanguage();

  if (variant === 'full') {
    return (
      <ul className={styles.langList} role="list">
        {supportedLanguages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <li key={lang.code}>
              <button
                type="button"
                className={`${styles.langOption} ${isActive ? styles.langOptionActive : ''}`}
                onClick={() => setLanguage(lang.code)}
                aria-pressed={isActive}
                dir={lang.dir}
              >
                <span className={styles.langNative}>{lang.nativeName}</span>
                {lang.nativeName !== lang.name && (
                  <span className={styles.langEnglish}>{lang.name}</span>
                )}
                {isActive && (
                  <span className={styles.langCheck} aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  // Compact variant — for exactly 2 languages keep the "XX \| YY" toggle;
  // for 3+ languages render a native <select>.
  if (supportedLanguages.length === 2) {
    const [lang1, lang2] = supportedLanguages as [
      (typeof supportedLanguages)[0],
      (typeof supportedLanguages)[0],
    ];
    return (
      <button
        className={`${styles.switcher} ${tone === 'inverse' ? styles.switcherInverse : ''}`}
        onClick={toggleLanguage}
        aria-label={language === lang1.code ? `Switch to ${lang2.name}` : `Switch to ${lang1.name}`}
        type="button"
      >
        <span className={language === lang1.code ? styles.active : styles.inactive}>
          {lang1.shortLabel}
        </span>
        <span className={styles.divider} aria-hidden="true">
          |
        </span>
        <span className={language === lang2.code ? styles.active : styles.inactive}>
          {lang2.shortLabel}
        </span>
      </button>
    );
  }

  return (
    <select
      className={`${styles.select} ${tone === 'inverse' ? styles.selectInverse : ''}`}
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label={t('common.select_language')}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};
