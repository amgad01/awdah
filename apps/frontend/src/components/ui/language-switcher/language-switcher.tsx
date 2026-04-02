import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import styles from './language-switcher.module.css';

type LanguageSwitcherProps = {
  variant?: 'compact' | 'full';
  tone?: 'default' | 'inverse';
  density?: 'default' | 'compact';
};

type LanguageItem = {
  code: string;
  name: string;
  nativeName: string;
  shortLabel: string;
  dir?: 'ltr' | 'rtl';
};

const cls = (...tokens: Array<string | false | null | undefined>) =>
  tokens.filter(Boolean).join(' ');

const getLanguageLabel = (language: LanguageItem) =>
  language.nativeName === language.name
    ? language.nativeName
    : `${language.nativeName} · ${language.name}`;

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'compact',
  tone = 'default',
  density = 'default',
}) => {
  const { language, setLanguage, toggleLanguage, supportedLanguages, t } = useLanguage();
  const isCompact = variant === 'compact';
  const isDense = density === 'compact';
  const isInverse = tone === 'inverse';
  const hasTwoLanguages = supportedLanguages.length === 2;
  const shouldRenderInlineList =
    variant === 'full' || (supportedLanguages.length > 2 && supportedLanguages.length <= 5);
  const iconSize = isCompact || isDense ? 14 : 16;

  if (!supportedLanguages.length) {
    return null;
  }

  const currentLanguage =
    supportedLanguages.find((lang) => lang.code === language) ?? supportedLanguages[0];

  const nextLanguage = supportedLanguages.find((lang) => lang.code !== language) ?? currentLanguage;

  const themeClass = isInverse ? styles.inverse : styles.default;
  const densityClass = isDense ? styles.compactDensity : styles.defaultDensity;

  // Horizontal list for 3-5 languages (clean, always visible)
  if (shouldRenderInlineList) {
    return (
      <div className={cls(styles.root, styles.inline, themeClass, densityClass)}>
        <span className={styles.inlineIcon} aria-hidden="true">
          <Globe size={iconSize} />
        </span>
        <div className={styles.inlineList} role="group" aria-label={t('common.select_language')}>
          {supportedLanguages.map((lang) => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                className={cls(styles.inlineItem, isActive && styles.inlineItemActive)}
                onClick={() => setLanguage(lang.code)}
                aria-pressed={isActive}
                dir={lang.dir}
                title={getLanguageLabel(lang)}
              >
                <span className={styles.inlineCode}>{lang.shortLabel.toUpperCase()}</span>
                {!isCompact && <span className={styles.inlineName}>{lang.nativeName}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Toggle button for exactly 2 languages
  if (hasTwoLanguages) {
    return (
      <button
        type="button"
        className={cls(
          styles.root,
          styles.control,
          styles.toggle,
          themeClass,
          densityClass,
          isCompact && styles.compact,
        )}
        onClick={toggleLanguage}
        aria-label={`Switch to ${nextLanguage?.name ?? nextLanguage?.nativeName}`}
        title={`Switch to ${nextLanguage?.name ?? nextLanguage?.nativeName}`}
      >
        <span className={styles.icon} aria-hidden="true">
          <Globe size={iconSize} />
        </span>
        <span className={styles.code}>{currentLanguage?.shortLabel.toUpperCase()}</span>
        {!isCompact && !isDense ? (
          <span className={styles.codeMuted} aria-hidden="true">
            {nextLanguage?.shortLabel.toUpperCase()}
          </span>
        ) : null}
      </button>
    );
  }

  // Native select for 6+ languages (browser handles everything)
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  return (
    <div
      className={cls(
        styles.root,
        styles.selectWrapper,
        themeClass,
        densityClass,
        isCompact && styles.compact,
      )}
    >
      <span className={styles.selectIcon} aria-hidden="true">
        <Globe size={iconSize} />
      </span>
      <select
        value={language}
        onChange={handleSelectChange}
        className={styles.select}
        aria-label={t('common.select_language')}
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {isCompact ? lang.shortLabel.toUpperCase() : getLanguageLabel(lang)}
          </option>
        ))}
      </select>
      <span className={styles.selectChevron} aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
};
