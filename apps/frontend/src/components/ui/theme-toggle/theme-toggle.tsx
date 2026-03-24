import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import styles from './theme-toggle.module.css';

export const ThemeToggle: React.FC = () => {
  const { isDark, toggle } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={isDark ? t('settings.theme_switch_light') : t('settings.theme_switch_dark')}
      title={isDark ? t('settings.theme_switch_light') : t('settings.theme_switch_dark')}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
