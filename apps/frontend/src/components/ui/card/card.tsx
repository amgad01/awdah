import React, { type ReactNode } from 'react';
import styles from './card.module.css';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Card title. Rendered inside an `<h3>`, so avoid passing block-level
   * elements or other headings to prevent invalid HTML nesting.
   */
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'primary' | 'outline' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const cardClassName = `${styles.card} ${styles[variant]} ${className}`;

  return (
    <div className={cardClassName} {...props}>
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
