export const QUERY_KEYS = {
  salahDebt: ['salah-debt'] as const,
  sawmDebt: ['sawm-debt'] as const,
  salahDailyLogs: (date: string) => ['salah-daily', date] as const,
  sawmDailyLog: (date: string) => ['sawm-daily', date] as const,
  salahHistoryPrefix: ['salah-history'] as const,
  salahHistory: (startDate: string, endDate: string) =>
    ['salah-history', startDate, endDate] as const,
  salahHistoryPage: (startDate: string, endDate: string, limit: number) =>
    ['salah-history', 'page', startDate, endDate, limit] as const,
  sawmHistoryPrefix: ['sawm-history'] as const,
  sawmHistory: (startDate: string, endDate: string) =>
    ['sawm-history', startDate, endDate] as const,
  sawmHistoryPage: (startDate: string, endDate: string, limit: number) =>
    ['sawm-history', 'page', startDate, endDate, limit] as const,
  combinedHistoryPrefix: ['combined-history'] as const,
  combinedHistory: (startDate: string, endDate: string, limit: number) =>
    ['combined-history', startDate, endDate, limit] as const,
  userProfile: ['user-profile'] as const,
  practicingPeriods: ['practicing-periods'] as const,
} as const;
