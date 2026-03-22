import React, { type ReactNode } from 'react';
import styles from './card.module.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  variant?: 'default' | 'primary' | 'outline' | 'glass';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  variant = 'default',
  className = '',
}) => {
  const cardClassName = `${styles.card} ${styles[variant]} ${className}`;

  return (
    <div className={cardClassName}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  );
};
