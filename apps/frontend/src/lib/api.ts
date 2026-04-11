import {
  clearPersistedSession,
  getAuthServiceSync,
  publishAuthNotice,
  readPersistedSession,
} from '@/lib/auth-service';
import { getApiClient } from '@/lib/api-client';
import type { ApiErrorResponse } from '@awdah/shared';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'cognito';
let signingOut = false;
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
  action: 'prayed' | 'deselected';
  loggedAt: string;
}

export interface FastLogResponse {
  eventId: string;
  date: string;
  type: string;
  action?: 'fasted' | 'deselected';
  loggedAt: string;
}

export interface HistoryPageResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface UserProfileResponse {
  userId: string;
  username?: string;
  dateOfBirth?: string;
  bulughDate: string;
  revertDate?: string;
  gender: 'male' | 'female';
}

export type UserLifecycleJobType = 'export' | 'delete-account' | 'reset-prayers' | 'reset-fasts';
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

interface QueryOptions {
  signal?: AbortSignal;
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

const SESSION_EXPIRED_MESSAGE = 'auth.session_expired';

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
  const session = authService?.getCurrentUser() ?? readPersistedSession();
  const token = session?.token ?? null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (AUTH_MODE === 'local' && session?.userId) {
    headers['x-user-id'] = session.userId;
  }

  const response = await getApiClient().fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid — clear the session and return to the auth screen.
    // Guard against concurrent 401s triggering multiple sign-out calls.
    if (!signingOut) {
      signingOut = true;
      try {
        if (authService) {
          await authService.signOut();
          publishAuthNotice('session-expired');
        } else {
          clearPersistedSession('session-expired');
        }
      } finally {
        signingOut = false;
      }
    }
    throw new ApiRequestError(SESSION_EXPIRED_MESSAGE, 401, 'UNAUTHENTICATED');
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
    getDebt: (options?: QueryOptions) => request<SalahDebtResponse>(`${SALAH_BASE}/debt`, options),
    logPrayer: (data: { date: string; prayerName: string; type: string }) =>
      request(`${SALAH_BASE}/log`, { method: 'POST', body: JSON.stringify(data) }),
    addPeriod: (data: { startDate: string; endDate?: string; type: string }) =>
      request(`${SALAH_BASE}/practicing-period`, { method: 'POST', body: JSON.stringify(data) }),
    updatePeriod: (data: { periodId: string; startDate: string; endDate?: string; type: string }) =>
      request(`${SALAH_BASE}/practicing-period`, { method: 'PUT', body: JSON.stringify(data) }),
    getPeriods: (options?: QueryOptions) =>
      request<PracticingPeriodResponse[]>(`${SALAH_BASE}/practicing-periods`, options),
    deletePeriod: (periodId: string) =>
      request(buildPath(`${SALAH_BASE}/practicing-period`, { periodId }), {
        method: 'DELETE',
      }),
    getHistory: (params: { startDate: string; endDate: string }, options?: QueryOptions) =>
      request<PrayerLogResponse[]>(buildPath(`${SALAH_BASE}/history`, params), options),
    getHistoryPage: (
      params: {
        startDate: string;
        endDate: string;
        limit: number;
        cursor?: string;
      },
      options?: QueryOptions,
    ) =>
      request<HistoryPageResponse<PrayerLogResponse>>(
        buildPath(`${SALAH_BASE}/history/page`, params),
        options,
      ),
    deleteLog: (params: { date: string; prayerName: string; type: string }) =>
      request(buildPath(`${SALAH_BASE}/log`, params), { method: 'DELETE' }),
    resetLogs: () => request<UserLifecycleJobEnvelope>(`${SALAH_BASE}/logs`, { method: 'DELETE' }),
  },
  sawm: {
    getDebt: (options?: QueryOptions) => request<SawmDebtResponse>(`${SAWM_BASE}/debt`, options),
    logFast: (data: { date: string; type: string }) =>
      request(`${SAWM_BASE}/log`, { method: 'POST', body: JSON.stringify(data) }),
    getHistory: (params: { startDate: string; endDate: string }, options?: QueryOptions) =>
      request<FastLogResponse[]>(buildPath(`${SAWM_BASE}/history`, params), options),
    getHistoryPage: (
      params: {
        startDate: string;
        endDate: string;
        limit: number;
        cursor?: string;
      },
      options?: QueryOptions,
    ) =>
      request<HistoryPageResponse<FastLogResponse>>(
        buildPath(`${SAWM_BASE}/history/page`, params),
        options,
      ),
    deleteLog: (params: { date: string; eventId: string }) =>
      request(buildPath(`${SAWM_BASE}/log`, params), { method: 'DELETE' }),
    resetLogs: () => request<UserLifecycleJobEnvelope>(`${SAWM_BASE}/logs`, { method: 'DELETE' }),
  },
  user: {
    getProfile: (options?: QueryOptions) =>
      request<UserProfileResponse>(`${USER_BASE}/profile`, options ?? {}, { allow404: true }),
    updateProfile: (data: {
      username?: string;
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
