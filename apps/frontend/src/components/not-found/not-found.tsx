import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import styles from './not-found.module.css';

export const NotFound: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('not_found.title')}</h1>
      <p className={styles.message}>{t('not_found.message')}</p>
      <Link to="/" className={styles.backLink}>
        {t('not_found.back_home')}
      </Link>
    </div>
  );
};
