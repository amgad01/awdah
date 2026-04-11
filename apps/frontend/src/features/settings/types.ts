export type PeriodType = 'both' | 'salah' | 'sawm';

export type ProfileFormState = {
  sourceKey: string;
  username: string;
  dateOfBirth: string;
  bulughDate: string;
  revertDate: string;
  gender: 'male' | 'female';
  // UI-specific form state
  bulughInputMode: 'date' | 'age' | 'auto';
  bulughAgeInput: string;
  isRevert: boolean;
};

export type FeedbackState = {
  tone: 'success' | 'error' | 'warning';
  message: string;
};

export type PeriodLike = {
  periodId?: string;
  startDate: string;
  endDate?: string;
  type: PeriodType;
};

export type DebtPreview = {
  current: number;
  next: number;
  delta: number;
};
