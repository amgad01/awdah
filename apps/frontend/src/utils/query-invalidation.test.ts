// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateSalahQueries,
  invalidateSawmQueries,
  invalidateUserProfile,
  invalidatePracticingPeriods,
  invalidateAllWorshipQueries,
  invalidatePeriodRelatedQueries,
  updateSalahDebtCache,
  updateSawmDebtCache,
  appendSalahDailyLog,
  removeSalahDailyLog,
  appendSawmDailyLog,
  removeSawmDailyLog,
  markSalahHistoryStale,
  markSawmHistoryStale,
  updateProfileCache,
  updatePeriodsCache,
  removeSalahQueries,
  removeSawmQueries,
} from './query-invalidation';
import { QUERY_KEYS } from '@/lib/query-keys';
import type {
  SalahDebtResponse,
  SawmDebtResponse,
  PrayerLogResponse,
  FastLogResponse,
} from '@/lib/api';

// ── shared fixtures ───────────────────────────────────────────────────────────

const SALAH_DEBT: SalahDebtResponse = {
  totalPrayersOwed: 100,
  completedPrayers: 10,
  remainingPrayers: 90,
  perPrayerRemaining: { fajr: 20, dhuhr: 18, asr: 18, maghrib: 17, isha: 17 },
};

const SAWM_DEBT: SawmDebtResponse = {
  totalDaysOwed: 30,
  completedDays: 5,
  remainingDays: 25,
};

const PRAYER_LOG: PrayerLogResponse = {
  eventId: 'e1',
  date: '1447-10-01',
  prayerName: 'fajr',
  type: 'qadaa',
  action: 'prayed',
  loggedAt: '2025-01-01T00:00:00.000Z',
};

const FAST_LOG: FastLogResponse = {
  eventId: 'f1',
  date: '1447-10-01',
  type: 'qadaa',
  loggedAt: '2025-01-01T00:00:00.000Z',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// ── invalidateSalahQueries ────────────────────────────────────────────────────

describe('invalidateSalahQueries', () => {
  let qc: QueryClient;
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    qc = makeClient();
    spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
  });

  it('invalidates debt, history, and combined', () => {
    invalidateSalahQueries(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-debt'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-history'], exact: false }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['combined-history'], exact: false }),
    );
  });

  it('invalidates daily logs when date is provided', () => {
    invalidateSalahQueries(qc, '1447-10-01');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-daily', '1447-10-01'], exact: true }),
    );
  });

  it('does not invalidate daily logs when date is omitted', () => {
    invalidateSalahQueries(qc);
    const dailyCalls = spy.mock.calls.filter(
      (c) => ((c[0] as { queryKey: readonly string[] }).queryKey[0] ?? '') === 'salah-daily',
    );
    expect(dailyCalls.length).toBe(0);
  });
});

// ── invalidateSawmQueries ─────────────────────────────────────────────────────

describe('invalidateSawmQueries', () => {
  let qc: QueryClient;
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    qc = makeClient();
    spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
  });

  it('invalidates debt, history, and combined', () => {
    invalidateSawmQueries(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-debt'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-history'], exact: false }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['combined-history'], exact: false }),
    );
  });

  it('invalidates daily log when date is provided', () => {
    invalidateSawmQueries(qc, '1447-10-01');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-daily', '1447-10-01'], exact: true }),
    );
  });
});

// ── invalidateAllWorshipQueries ───────────────────────────────────────────────

describe('invalidateAllWorshipQueries', () => {
  let qc: QueryClient;
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    qc = makeClient();
    spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
  });

  it('invalidates both debt queries immediately', () => {
    invalidateAllWorshipQueries(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-debt'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-debt'], exact: true }),
    );
  });

  it('marks history stale-only (refetchType: none)', () => {
    invalidateAllWorshipQueries(qc);
    const historyCalls = spy.mock.calls.filter(
      (c) => (c[0] as { refetchType?: string }).refetchType === 'none',
    );
    expect(historyCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('does not immediately refetch history', () => {
    invalidateAllWorshipQueries(qc);
    const eagerHistoryCalls = spy.mock.calls.filter((c) => {
      const arg = c[0] as { queryKey?: readonly string[]; refetchType?: string };
      const key = arg.queryKey?.[0] ?? '';
      return (key === 'salah-history' || key === 'sawm-history') && arg.refetchType !== 'none';
    });
    expect(eagerHistoryCalls.length).toBe(0);
  });
});

// ── invalidatePeriodRelatedQueries ────────────────────────────────────────────

describe('invalidatePeriodRelatedQueries', () => {
  it('invalidates practicing periods and both debt queries', () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    invalidatePeriodRelatedQueries(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['practicing-periods'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-debt'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-debt'], exact: true }),
    );
  });
});

// ── invalidateUserProfile / invalidatePracticingPeriods ───────────────────────

describe('invalidateUserProfile', () => {
  it('invalidates user profile with exact: true', () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    invalidateUserProfile(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['user-profile'], exact: true }),
    );
  });
});

describe('invalidatePracticingPeriods', () => {
  it('invalidates practicing periods with exact: true', () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    invalidatePracticingPeriods(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['practicing-periods'], exact: true }),
    );
  });
});

// ── updateSalahDebtCache ──────────────────────────────────────────────────────

describe('updateSalahDebtCache', () => {
  it('increments completedPrayers and decrements remainingPrayers for delta +1', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDebt, SALAH_DEBT);
    updateSalahDebtCache(qc, 'fajr', 1);
    const result = qc.getQueryData<SalahDebtResponse>(QUERY_KEYS.salahDebt)!;
    expect(result.completedPrayers).toBe(11);
    expect(result.remainingPrayers).toBe(89);
    expect(result.perPrayerRemaining['fajr']).toBe(19);
  });

  it('decrements completedPrayers and increments remainingPrayers for delta -1', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDebt, SALAH_DEBT);
    updateSalahDebtCache(qc, 'fajr', -1);
    const result = qc.getQueryData<SalahDebtResponse>(QUERY_KEYS.salahDebt)!;
    expect(result.completedPrayers).toBe(9);
    expect(result.remainingPrayers).toBe(91);
    expect(result.perPrayerRemaining['fajr']).toBe(21);
  });

  it('does not go below 0 for remainingPrayers', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDebt, { ...SALAH_DEBT, remainingPrayers: 0 });
    updateSalahDebtCache(qc, 'fajr', 1);
    const result = qc.getQueryData<SalahDebtResponse>(QUERY_KEYS.salahDebt)!;
    expect(result.remainingPrayers).toBe(0);
  });

  it('does not go below 0 for completedPrayers', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDebt, { ...SALAH_DEBT, completedPrayers: 0 });
    updateSalahDebtCache(qc, 'fajr', -1);
    const result = qc.getQueryData<SalahDebtResponse>(QUERY_KEYS.salahDebt)!;
    expect(result.completedPrayers).toBe(0);
  });

  it('is a no-op when cache is empty', () => {
    const qc = makeClient();
    updateSalahDebtCache(qc, 'fajr', 1);
    expect(qc.getQueryData(QUERY_KEYS.salahDebt)).toBeUndefined();
  });
});

// ── updateSawmDebtCache ───────────────────────────────────────────────────────

describe('updateSawmDebtCache', () => {
  it('increments completedDays and decrements remainingDays for delta +1', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.sawmDebt, SAWM_DEBT);
    updateSawmDebtCache(qc, 1);
    const result = qc.getQueryData<SawmDebtResponse>(QUERY_KEYS.sawmDebt)!;
    expect(result.completedDays).toBe(6);
    expect(result.remainingDays).toBe(24);
  });

  it('decrements completedDays and increments remainingDays for delta -1', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.sawmDebt, SAWM_DEBT);
    updateSawmDebtCache(qc, -1);
    const result = qc.getQueryData<SawmDebtResponse>(QUERY_KEYS.sawmDebt)!;
    expect(result.completedDays).toBe(4);
    expect(result.remainingDays).toBe(26);
  });

  it('does not go below 0 for remainingDays', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.sawmDebt, { ...SAWM_DEBT, remainingDays: 0 });
    updateSawmDebtCache(qc, 1);
    expect(qc.getQueryData<SawmDebtResponse>(QUERY_KEYS.sawmDebt)!.remainingDays).toBe(0);
  });

  it('does not go below 0 for completedDays', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.sawmDebt, { ...SAWM_DEBT, completedDays: 0 });
    updateSawmDebtCache(qc, -1);
    expect(qc.getQueryData<SawmDebtResponse>(QUERY_KEYS.sawmDebt)!.completedDays).toBe(0);
  });
});

// ── appendSalahDailyLog / removeSalahDailyLog ─────────────────────────────────

describe('appendSalahDailyLog', () => {
  it('appends an entry to an existing cache', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDailyLogs('1447-10-01'), [PRAYER_LOG]);
    appendSalahDailyLog(qc, '1447-10-01', { ...PRAYER_LOG, eventId: 'e2', prayerName: 'dhuhr' });
    const result = qc.getQueryData<PrayerLogResponse[]>(QUERY_KEYS.salahDailyLogs('1447-10-01'))!;
    expect(result).toHaveLength(2);
    expect(result[1]!.prayerName).toBe('dhuhr');
  });

  it('creates a new array when cache is empty', () => {
    const qc = makeClient();
    appendSalahDailyLog(qc, '1447-10-01', PRAYER_LOG);
    const result = qc.getQueryData<PrayerLogResponse[]>(QUERY_KEYS.salahDailyLogs('1447-10-01'))!;
    expect(result).toHaveLength(1);
  });
});

describe('removeSalahDailyLog', () => {
  it('removes the last matching entry by prayerName and type', () => {
    const qc = makeClient();
    const log2 = { ...PRAYER_LOG, eventId: 'e2' };
    qc.setQueryData(QUERY_KEYS.salahDailyLogs('1447-10-01'), [PRAYER_LOG, log2]);
    removeSalahDailyLog(qc, '1447-10-01', 'fajr', 'qadaa');
    const result = qc.getQueryData<PrayerLogResponse[]>(QUERY_KEYS.salahDailyLogs('1447-10-01'))!;
    expect(result).toHaveLength(1);
    expect(result[0]!.eventId).toBe('e1');
  });

  it('is a no-op when no matching entry exists', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDailyLogs('1447-10-01'), [PRAYER_LOG]);
    removeSalahDailyLog(qc, '1447-10-01', 'dhuhr', 'qadaa');
    expect(
      qc.getQueryData<PrayerLogResponse[]>(QUERY_KEYS.salahDailyLogs('1447-10-01')),
    ).toHaveLength(1);
  });
});

// ── appendSawmDailyLog / removeSawmDailyLog ───────────────────────────────────

describe('appendSawmDailyLog', () => {
  it('appends an entry to an existing cache', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.sawmDailyLog('1447-10-01'), [FAST_LOG]);
    appendSawmDailyLog(qc, '1447-10-01', { ...FAST_LOG, eventId: 'f2' });
    expect(qc.getQueryData<FastLogResponse[]>(QUERY_KEYS.sawmDailyLog('1447-10-01'))).toHaveLength(
      2,
    );
  });
});

describe('removeSawmDailyLog', () => {
  it('removes the entry matching eventId', () => {
    const qc = makeClient();
    const log2 = { ...FAST_LOG, eventId: 'f2' };
    qc.setQueryData(QUERY_KEYS.sawmDailyLog('1447-10-01'), [FAST_LOG, log2]);
    removeSawmDailyLog(qc, '1447-10-01', 'f1');
    const result = qc.getQueryData<FastLogResponse[]>(QUERY_KEYS.sawmDailyLog('1447-10-01'))!;
    expect(result).toHaveLength(1);
    expect(result[0]!.eventId).toBe('f2');
  });
});

// ── markSalahHistoryStale / markSawmHistoryStale ──────────────────────────────

describe('markSalahHistoryStale', () => {
  it('calls invalidateQueries with refetchType: none for salah and combined history', () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    markSalahHistoryStale(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-history'], refetchType: 'none' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['combined-history'], refetchType: 'none' }),
    );
  });
});

describe('markSawmHistoryStale', () => {
  it('calls invalidateQueries with refetchType: none for sawm and combined history', () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    markSawmHistoryStale(qc);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-history'], refetchType: 'none' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['combined-history'], refetchType: 'none' }),
    );
  });
});

// ── updateProfileCache ────────────────────────────────────────────────────────

describe('updateProfileCache', () => {
  it('updates profile fields from mutation variables', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.userProfile, {
      userId: 'u1',
      username: 'old',
      bulughDate: '1440-01-01',
      gender: 'male' as const,
    });
    updateProfileCache(qc, {
      username: 'new',
      bulughDate: '1441-01-01',
      gender: 'female',
      dateOfBirth: '1425-01-01',
    });
    const result = qc.getQueryData<{
      username?: string;
      bulughDate: string;
      gender: string;
      dateOfBirth?: string;
    }>(QUERY_KEYS.userProfile)!;
    expect(result.username).toBe('new');
    expect(result.bulughDate).toBe('1441-01-01');
    expect(result.gender).toBe('female');
    expect(result.dateOfBirth).toBe('1425-01-01');
  });

  it('is a no-op when cache is empty', () => {
    const qc = makeClient();
    updateProfileCache(qc, { bulughDate: '1441-01-01', gender: 'male' });
    expect(qc.getQueryData(QUERY_KEYS.userProfile)).toBeUndefined();
  });
});

// ── updatePeriodsCache ────────────────────────────────────────────────────────

describe('updatePeriodsCache', () => {
  const period = {
    periodId: 'p1',
    startDate: '1440-01-01',
    endDate: '1441-01-01',
    type: 'both' as const,
  };

  it('removes the matching period on delete', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.practicingPeriods, [period]);
    updatePeriodsCache(qc, { action: 'delete', periodId: 'p1' });
    expect(qc.getQueryData<(typeof period)[]>(QUERY_KEYS.practicingPeriods)).toHaveLength(0);
  });

  it('updates the matching period on update', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.practicingPeriods, [period]);
    updatePeriodsCache(qc, {
      action: 'update',
      period: { periodId: 'p1', startDate: '1442-01-01', endDate: '1443-01-01', type: 'salah' },
    });
    const result = qc.getQueryData<(typeof period)[]>(QUERY_KEYS.practicingPeriods)!;
    expect(result[0]!.startDate).toBe('1442-01-01');
    expect(result[0]!.type).toBe('salah');
  });

  it('appends an optimistic entry on add', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.practicingPeriods, [period]);
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    updatePeriodsCache(qc, {
      action: 'add',
      period: { startDate: '1444-01-01', type: 'sawm' },
    });
    const result = qc.getQueryData<(typeof period)[]>(QUERY_KEYS.practicingPeriods)!;
    expect(result).toHaveLength(2);
    expect(result[1]!.startDate).toBe('1444-01-01');
    expect(result[1]!.periodId).toMatch(/^optimistic-/);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['practicing-periods'], exact: true }),
    );
    expect(
      spy.mock.calls.some((call) => (call[0] as { refetchType?: string }).refetchType === 'none'),
    ).toBe(false);
  });
});

// ── removeSalahQueries / removeSawmQueries ────────────────────────────────────

describe('removeSalahQueries', () => {
  it('removes debt and marks history stale-only', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.salahDebt, SALAH_DEBT);
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    const removeSpy = vi.spyOn(qc, 'removeQueries');
    removeSalahQueries(qc);
    expect(removeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-debt'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-history'], refetchType: 'none' }),
    );
  });
});

describe('removeSawmQueries', () => {
  it('removes debt and marks history stale-only', () => {
    const qc = makeClient();
    qc.setQueryData(QUERY_KEYS.sawmDebt, SAWM_DEBT);
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    const removeSpy = vi.spyOn(qc, 'removeQueries');
    removeSawmQueries(qc);
    expect(removeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-debt'], exact: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-history'], refetchType: 'none' }),
    );
  });
});
