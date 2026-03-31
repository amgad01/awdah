import React from 'react';
import styles from './brand-lockup.module.css';

interface BrandLockupProps {
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md';
  className?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({
  tone = 'dark',
  size = 'md',
  className = '',
}) => {
  const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`;

  return (
    <span className={`${styles.root} ${styles[tone]} ${styles[size]} ${className}`.trim()}>
      <img src={logoUrl} alt="" className={styles.logo} />
      <span className={styles.text}>
        <span className={styles.en}>Awdah</span>
        <span className={styles.divider}>·</span>
        <span className={styles.ar}>عودة</span>
      </span>
    </span>
  );
};
