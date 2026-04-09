import {
  api,
  type HistoryPageResponse,
  type PrayerLogResponse,
  type PracticingPeriodResponse,
  type SalahDebtResponse,
  type UserLifecycleJobEnvelope,
} from '@/lib/api';

export interface CreatePracticingPeriodInput {
  startDate: string;
  endDate?: string;
  type: 'salah' | 'sawm' | 'both';
}

export interface UpdatePracticingPeriodInput extends CreatePracticingPeriodInput {
  periodId: string;
}

export interface LogPrayerInput {
  date: string;
  prayerName: string;
  type: string;
}

export interface DeletePrayerInput {
  date: string;
  prayerName: string;
  type: string;
}

export const salahRepository = {
  getDebt: () => api.salah.getDebt() as Promise<SalahDebtResponse | null>,
  logPrayer: (data: LogPrayerInput) => api.salah.logPrayer(data),
  deletePrayerLog: (params: DeletePrayerInput) => api.salah.deleteLog(params),
  getHistory: (params: { startDate: string; endDate: string }) => api.salah.getHistory(params),
  getHistoryPage: (params: {
    startDate: string;
    endDate: string;
    limit: number;
    cursor?: string;
  }) => api.salah.getHistoryPage(params) as Promise<HistoryPageResponse<PrayerLogResponse> | null>,
  getPracticingPeriods: () => api.salah.getPeriods() as Promise<PracticingPeriodResponse[] | null>,
  addPracticingPeriod: (data: CreatePracticingPeriodInput) => api.salah.addPeriod(data),
  updatePracticingPeriod: (data: UpdatePracticingPeriodInput) => api.salah.updatePeriod(data),
  deletePracticingPeriod: (periodId: string) => api.salah.deletePeriod(periodId),
  resetLogs: () => api.salah.resetLogs() as Promise<UserLifecycleJobEnvelope | null>,
};
