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
  getDebt: (signal?: AbortSignal) =>
    api.salah.getDebt({ signal }) as Promise<SalahDebtResponse | null>,
  logPrayer: (data: LogPrayerInput) => api.salah.logPrayer(data),
  deletePrayerLog: (params: DeletePrayerInput) => api.salah.deleteLog(params),
  getHistory: (params: { startDate: string; endDate: string }, signal?: AbortSignal) =>
    api.salah.getHistory(params, { signal }),
  getHistoryPage: (
    params: {
      startDate: string;
      endDate: string;
      limit: number;
      cursor?: string;
    },
    signal?: AbortSignal,
  ) =>
    api.salah.getHistoryPage(params, {
      signal,
    }) as Promise<HistoryPageResponse<PrayerLogResponse> | null>,
  getPracticingPeriods: (signal?: AbortSignal) =>
    api.salah.getPeriods({ signal }) as Promise<PracticingPeriodResponse[] | null>,
  addPracticingPeriod: (data: CreatePracticingPeriodInput) => api.salah.addPeriod(data),
  updatePracticingPeriod: (data: UpdatePracticingPeriodInput) => api.salah.updatePeriod(data),
  deletePracticingPeriod: (periodId: string) => api.salah.deletePeriod(periodId),
  resetLogs: () => api.salah.resetLogs() as Promise<UserLifecycleJobEnvelope | null>,
};
