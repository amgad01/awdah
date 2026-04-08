// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateSalahQueries,
  invalidateSawmQueries,
  invalidateUserProfile,
  invalidatePracticingPeriods,
  invalidateAllWorshipQueries,
} from './query-invalidation';

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  queryClient = new QueryClient();
  invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
});

describe('invalidateSalahQueries', () => {
  it('invalidates debt, history, and combined with correct exact flags', () => {
    invalidateSalahQueries(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-debt'], exact: true }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-history'], exact: false }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['combined-history'], exact: false }),
    );
  });

  it('invalidates daily logs when date is provided', () => {
    invalidateSalahQueries(queryClient, '1447-10-01');

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-daily', '1447-10-01'], exact: true }),
    );
  });

  it('does not invalidate daily logs when date is omitted', () => {
    invalidateSalahQueries(queryClient);

    const dailyCalls = invalidateSpy.mock.calls.filter(
      (call) => ((call[0] as { queryKey: readonly string[] }).queryKey[0] ?? '') === 'salah-daily',
    );
    expect(dailyCalls.length).toBe(0);
  });
});

describe('invalidateSawmQueries', () => {
  it('invalidates debt, history, and combined with correct exact flags', () => {
    invalidateSawmQueries(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-debt'], exact: true }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-history'], exact: false }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['combined-history'], exact: false }),
    );
  });

  it('invalidates daily log when date is provided', () => {
    invalidateSawmQueries(queryClient, '1447-10-01');

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-daily', '1447-10-01'], exact: true }),
    );
  });
});

describe('invalidateUserProfile', () => {
  it('invalidates user profile with exact: true', () => {
    invalidateUserProfile(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['user-profile'], exact: true }),
    );
  });
});

describe('invalidatePracticingPeriods', () => {
  it('invalidates practicing periods with exact: true', () => {
    invalidatePracticingPeriods(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['practicing-periods'], exact: true }),
    );
  });
});

describe('invalidateAllWorshipQueries', () => {
  it('invalidates both salah and sawm queries', () => {
    invalidateAllWorshipQueries(queryClient);

    // salah queries
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['salah-debt'], exact: true }),
    );
    // sawm queries
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sawm-debt'], exact: true }),
    );
    // combined history invalidated (from both salah and sawm)
    const combinedCalls = invalidateSpy.mock.calls.filter(
      (call) =>
        ((call[0] as { queryKey?: readonly string[] })?.queryKey?.[0] ?? '') === 'combined-history',
    );
    expect(combinedCalls.length).toBeGreaterThanOrEqual(1);
  });
});
