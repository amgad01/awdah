import React from 'react';
import type { FeedbackState } from '../types';
import styles from '../settings-page.module.css';

interface SectionNoticeProps {
  feedback: FeedbackState;
}

export const SectionNotice: React.FC<SectionNoticeProps> = ({ feedback }) => {
  const toneClass =
    feedback.tone === 'error'
      ? styles.sectionNoticeError
      : feedback.tone === 'warning'
        ? styles.sectionNoticeWarning
        : styles.sectionNoticeSuccess;
  return (
    <p
      className={`${styles.sectionNotice} ${toneClass}`}
      role={feedback.tone === 'error' ? 'alert' : undefined}
    >
      {feedback.message}
    </p>
  );
};
