import React, { type ReactNode, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import styles from '../dashboard.module.css';

interface ToggleDetailsProps {
  children: ReactNode;
}

export const ToggleDetails: React.FC<ToggleDetailsProps> = ({ children }) => {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <button
        className={styles.toggleRemaining}
        onClick={() => setShowDetails((value) => !value)}
        aria-expanded={showDetails}
        type="button"
      >
        {showDetails ? t('dashboard.hide_details') : t('dashboard.view_details')}
      </button>
      {showDetails && <div className={styles.remainingDetail}>{children}</div>}
    </>
  );
};
