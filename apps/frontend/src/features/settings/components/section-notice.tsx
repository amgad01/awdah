import React from 'react';
import type { FeedbackState } from '../types';
import styles from '../settings-page.module.css';

interface SectionNoticeProps {
  feedback: FeedbackState;
}

export const SectionNotice: React.FC<SectionNoticeProps> = ({ feedback }) => (
  <p
    className={`${styles.sectionNotice} ${
      feedback.tone === 'error' ? styles.sectionNoticeError : styles.sectionNoticeSuccess
    }`}
    role={feedback.tone === 'error' ? 'alert' : undefined}
  >
    {feedback.message}
  </p>
);
