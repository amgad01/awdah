import type { ApiErrorResponse } from '@awdah/shared';
import { clearPersistedSession, getAuthServiceSync, publishAuthNotice } from '@/lib/auth-service';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SALAH_BASE = '/v1/salah';
const SAWM_BASE = '/v1/sawm';
const USER_BASE = '/v1/user';

export interface SalahDebtResponse {
  totalPrayersOwed: number;
  completedPrayers: number;
  remainingPrayers: number;
  perPrayerRemaining: Record<string, number>;
}

export interface SawmDebtResponse {
  totalDaysOwed: number;
  completedDays: number;
  remainingDays: number;
}

export interface PrayerLogResponse {
  eventId: string;
  date: string;
  prayerName: string;
  type: string;
  loggedAt: string;
}

export interface FastLogResponse {
  eventId: string;
  date: string;
  type: string;
  loggedAt: string;
}

export interface HistoryPageResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface UserProfileResponse {
  userId: string;
  dateOfBirth?: string;
  bulughDate: string;
  revertDate?: string;
  gender: 'male' | 'female';
}

export type UserLifecycleJobType = 'export' | 'delete-account';
export type UserLifecycleJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface UserLifecycleJobResponse {
  jobId: string;
  type: UserLifecycleJobType;
  status: UserLifecycleJobStatus;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  exportFileName?: string;
  exportContentType?: string;
  exportChunkCount?: number;
  authCleanupRequired?: boolean;
  authDeleted?: boolean;
  authCleanupCompletedAt?: string;
}

export interface UserLifecycleJobEnvelope {
  message: string;
  job: UserLifecycleJobResponse;
}

export interface DeleteAccountResponse {
  message: string;
  authDeleted: boolean;
}

export interface ExportDownloadResponse {
  message: string;
  fileName: string;
  data: Record<string, unknown>;
}

export interface PracticingPeriodResponse {
  periodId: string;
  startDate: string;
  endDate?: string;
  type: 'salah' | 'sawm' | 'both';
}

interface RequestConfig {
  allow404?: boolean;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  config: RequestConfig = {},
): Promise<T | null> {
  const authService = getAuthServiceSync();
  const token = authService?.getToken() ?? null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid — clear the session and return to the auth screen
    if (authService) {
      await authService.signOut();
      publishAuthNotice('session-expired');
    } else {
      clearPersistedSession('session-expired');
    }
    return null;
  }

  if (response.status === 404 && config.allow404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await parseJson<ApiErrorResponse>(response);
    throw new ApiRequestError(
      errorBody?.error.message || `HTTP ${response.status}`,
      response.status,
      errorBody?.error.code,
    );
  }

  return parseJson<T>(response);
}

function buildPath(path: string, params?: Record<string, string | number | undefined>): string {
  if (!params) {
    return path;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const api = {
  salah: {
    getDebt: () => request<SalahDebtResponse>(`${SALAH_BASE}/debt`),
    logPrayer: (data: { date: string; prayerName: string; type: string }) =>
      request(`${SALAH_BASE}/log`, { method: 'POST', body: JSON.stringify(data) }),
    addPeriod: (data: { startDate: string; endDate?: string; type: string }) =>
      request(`${SALAH_BASE}/practicing-period`, { method: 'POST', body: JSON.stringify(data) }),
    updatePeriod: (data: { periodId: string; startDate: string; endDate?: string; type: string }) =>
      request(`${SALAH_BASE}/practicing-period`, { method: 'PUT', body: JSON.stringify(data) }),
    getPeriods: () => request<PracticingPeriodResponse[]>(`${SALAH_BASE}/practicing-periods`),
    deletePeriod: (periodId: string) =>
      request(buildPath(`${SALAH_BASE}/practicing-period`, { periodId }), {
        method: 'DELETE',
      }),
    getHistory: (params: { startDate: string; endDate: string }) =>
      request<PrayerLogResponse[]>(buildPath(`${SALAH_BASE}/history`, params)),
    getHistoryPage: (params: {
      startDate: string;
      endDate: string;
      limit: number;
      cursor?: string;
    }) =>
      request<HistoryPageResponse<PrayerLogResponse>>(
        buildPath(`${SALAH_BASE}/history/page`, params),
      ),
    deleteLog: (params: { date: string; prayerName: string; eventId: string }) =>
      request(buildPath(`${SALAH_BASE}/log`, params), { method: 'DELETE' }),
    resetLogs: () => request(`${SALAH_BASE}/logs`, { method: 'DELETE' }),
  },
  sawm: {
    getDebt: () => request<SawmDebtResponse>(`${SAWM_BASE}/debt`),
    logFast: (data: { date: string; type: string }) =>
      request(`${SAWM_BASE}/log`, { method: 'POST', body: JSON.stringify(data) }),
    getHistory: (params: { startDate: string; endDate: string }) =>
      request<FastLogResponse[]>(buildPath(`${SAWM_BASE}/history`, params)),
    getHistoryPage: (params: {
      startDate: string;
      endDate: string;
      limit: number;
      cursor?: string;
    }) =>
      request<HistoryPageResponse<FastLogResponse>>(buildPath(`${SAWM_BASE}/history/page`, params)),
    deleteLog: (params: { date: string; eventId: string }) =>
      request(buildPath(`${SAWM_BASE}/log`, params), { method: 'DELETE' }),
    resetLogs: () => request(`${SAWM_BASE}/logs`, { method: 'DELETE' }),
  },
  user: {
    getProfile: () => request<UserProfileResponse>(`${USER_BASE}/profile`, {}, { allow404: true }),
    updateProfile: (data: {
      bulughDate: string;
      gender: string;
      dateOfBirth?: string;
      revertDate?: string;
    }) => request(`${USER_BASE}/profile`, { method: 'POST', body: JSON.stringify(data) }),
    startDeleteAccount: () =>
      request<UserLifecycleJobEnvelope>(`${USER_BASE}/account`, { method: 'DELETE' }),
    finalizeDeleteAccount: (jobId: string) =>
      request<DeleteAccountResponse>(buildPath(`${USER_BASE}/account/auth`, { jobId }), {
        method: 'DELETE',
      }),
    getJobStatus: (jobId: string) =>
      request<{ job: UserLifecycleJobResponse }>(buildPath(`${USER_BASE}/jobs/status`, { jobId })),
    startExportData: () =>
      request<UserLifecycleJobEnvelope>(`${USER_BASE}/export`, { method: 'POST' }),
    downloadExportData: (jobId: string) =>
      request<ExportDownloadResponse>(buildPath(`${USER_BASE}/export`, { jobId })),
  },
};
