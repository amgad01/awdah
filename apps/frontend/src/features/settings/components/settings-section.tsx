import React, { type ReactNode } from 'react';
import { Card } from '@/components/ui/card/card';
import styles from '../settings-page.module.css';

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  variant?: 'default' | 'danger';
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon,
  title,
  children,
  variant = 'default',
}) => (
  <Card className={`${styles.section} ${variant === 'danger' ? styles.dangerZone : ''}`}>
    <div className={styles.sectionHeader}>
      <div className={`${styles.sectionIcon} ${variant === 'danger' ? styles.dangerIcon : ''}`}>
        {icon}
      </div>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
    {children}
  </Card>
);
