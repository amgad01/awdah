import React from 'react';
import type { FeedbackState } from '../types';

interface SectionNoticeProps {
  feedback: FeedbackState;
}

export const SectionNotice: React.FC<SectionNoticeProps> = ({ feedback }) => {
  const toneClass =
    feedback.tone === 'error'
      ? 'noticeError'
      : feedback.tone === 'warning'
        ? 'noticeWarning'
        : 'noticeSuccess';
  return (
    <p className={`noticeBox ${toneClass}`} role={feedback.tone === 'error' ? 'alert' : undefined}>
      {feedback.message}
    </p>
  );
};
