export type ProfileFormState = {
  sourceKey: string;
  dateOfBirth: string;
  bulughDate: string;
  revertDate: string;
  gender: 'male' | 'female';
};

export type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
};

export type PeriodLike = {
  periodId?: string;
  startDate: string;
  endDate?: string;
  type: 'both' | 'salah' | 'sawm';
};

export type DebtPreview = {
  current: number;
  next: number;
  delta: number;
};
