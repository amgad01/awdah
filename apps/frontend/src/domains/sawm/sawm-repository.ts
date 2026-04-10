import {
  api,
  type FastLogResponse,
  type HistoryPageResponse,
  type SawmDebtResponse,
  type UserLifecycleJobEnvelope,
} from '@/lib/api';

export interface LogFastInput {
  date: string;
  type: string;
}

export interface DeleteFastInput {
  date: string;
  eventId: string;
}

export const sawmRepository = {
  getDebt: (signal?: AbortSignal) =>
    api.sawm.getDebt({ signal }) as Promise<SawmDebtResponse | null>,
  logFast: (data: LogFastInput) => api.sawm.logFast(data),
  deleteFastLog: (params: DeleteFastInput) => api.sawm.deleteLog(params),
  getHistory: (params: { startDate: string; endDate: string }, signal?: AbortSignal) =>
    api.sawm.getHistory(params, { signal }),
  getHistoryPage: (
    params: {
      startDate: string;
      endDate: string;
      limit: number;
      cursor?: string;
    },
    signal?: AbortSignal,
  ) =>
    api.sawm.getHistoryPage(params, {
      signal,
    }) as Promise<HistoryPageResponse<FastLogResponse> | null>,
  resetLogs: () => api.sawm.resetLogs() as Promise<UserLifecycleJobEnvelope | null>,
};
