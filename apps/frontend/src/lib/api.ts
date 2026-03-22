import { getAuthServiceSync } from '../hooks/use-auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SALAH_BASE = '/v1/salah';
const SAWM_BASE = '/v1/sawm';
const USER_BASE = '/v1/user';

export interface SalahDebtResponse {
  totalPrayersOwed: number;
  completedPrayers: number;
  remainingPrayers: number;
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

export interface UserProfileResponse {
  userId: string;
  dateOfBirth?: string;
  bulughDate: string;
  gender: 'male' | 'female';
}

export interface PracticingPeriodResponse {
  periodId: string;
  startDate: string;
  endDate?: string;
  type: 'salah' | 'sawm' | 'both';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T | null> {
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
    // Token expired or invalid — sign out and reload
    if (authService) {
      await authService.signOut();
      window.location.reload();
    }
    return null;
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  salah: {
    getDebt: () => request<SalahDebtResponse>(`${SALAH_BASE}/debt`),
    logPrayer: (data: { date: string; prayerName: string; type: string }) =>
      request(`${SALAH_BASE}/log`, { method: 'POST', body: JSON.stringify(data) }),
    addPeriod: (data: { startDate: string; endDate?: string; type: string }) =>
      request(`${SALAH_BASE}/practicing-period`, { method: 'POST', body: JSON.stringify(data) }),
    getPeriods: () => request<PracticingPeriodResponse[]>(`${SALAH_BASE}/practicing-periods`),
    deletePeriod: (periodId: string) =>
      request(`${SALAH_BASE}/practicing-period?periodId=${encodeURIComponent(periodId)}`, {
        method: 'DELETE',
      }),
    getHistory: (params: { startDate: string; endDate: string }) =>
      request<PrayerLogResponse[]>(
        `${SALAH_BASE}/history?startDate=${params.startDate}&endDate=${params.endDate}`,
      ),
    deleteLog: (params: { date: string; prayerName: string; eventId: string }) =>
      request(
        `${SALAH_BASE}/log?date=${params.date}&prayerName=${params.prayerName}&eventId=${params.eventId}`,
        { method: 'DELETE' },
      ),
  },
  sawm: {
    getDebt: () => request<SawmDebtResponse>(`${SAWM_BASE}/debt`),
    logFast: (data: { date: string; type: string }) =>
      request(`${SAWM_BASE}/log`, { method: 'POST', body: JSON.stringify(data) }),
    getHistory: (params: { startDate: string; endDate: string }) =>
      request<FastLogResponse[]>(
        `${SAWM_BASE}/history?startDate=${params.startDate}&endDate=${params.endDate}`,
      ),
    deleteLog: (params: { date: string; eventId: string }) =>
      request(`${SAWM_BASE}/log?date=${params.date}&eventId=${params.eventId}`, {
        method: 'DELETE',
      }),
  },
  user: {
    getProfile: () => request<UserProfileResponse>(`${USER_BASE}/profile`),
    updateProfile: (data: { bulughDate: string; gender: string; dateOfBirth?: string }) =>
      request(`${USER_BASE}/profile`, { method: 'POST', body: JSON.stringify(data) }),
    deleteAccount: () => request(`${USER_BASE}/account`, { method: 'DELETE' }),
    exportData: () =>
      request<{ message: string; data: Record<string, unknown> }>(`${USER_BASE}/export`),
  },
};
