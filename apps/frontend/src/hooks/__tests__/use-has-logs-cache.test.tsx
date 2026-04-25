import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useHasLogsCache, useHasDailyLog } from '../use-has-logs-cache';
import { QUERY_KEYS } from '@/lib/query-keys';

// ── shared wrapper factory ────────────────────────────────────────────────────

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ── shared log fixtures ───────────────────────────────────────────────────────

const PRAYER_LOG = {
  eventId: 'e1',
  date: '1446-10-01',
  loggedAt: '2024-01-01',
  prayerName: 'fajr',
  type: 'obligatory',
};
const FAST_LOG = { eventId: 'e2', date: '1446-10-01', loggedAt: '2024-01-01', type: 'ramadan' };

// ── useHasLogsCache ───────────────────────────────────────────────────────────

describe('useHasLogsCache', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns null when no relevant queries are cached', () => {
    const { result } = renderHook(() => useHasLogsCache('prayers'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current).toBeNull();
  });

  it('returns false when a successful query has an empty array', async () => {
    client.setQueryData(QUERY_KEYS.salahHistoryPrefix, []);
    const { result } = renderHook(() => useHasLogsCache('prayers'), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });

  it('returns true when a successful query has prayer log items', async () => {
    client.setQueryData(
      [...QUERY_KEYS.salahHistoryPrefix, '1446-10-01', '1446-10-07'],
      [PRAYER_LOG],
    );
    const { result } = renderHook(() => useHasLogsCache('prayers'), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });

  it('returns true when a successful query has fast log items', async () => {
    client.setQueryData([...QUERY_KEYS.sawmHistoryPrefix, '1446-10-01', '1446-10-07'], [FAST_LOG]);
    const { result } = renderHook(() => useHasLogsCache('fasts'), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });

  it('returns true when paginated pages contain items', async () => {
    client.setQueryData(QUERY_KEYS.salahHistoryPrefix, {
      pages: [{ items: [PRAYER_LOG], hasMore: false }],
      pageParams: [undefined],
    });
    const { result } = renderHook(() => useHasLogsCache('prayers'), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(true);
  });

  it('returns false when paginated pages are all empty', async () => {
    client.setQueryData(QUERY_KEYS.salahHistoryPrefix, {
      pages: [{ items: [], hasMore: false }],
      pageParams: [undefined],
    });
    const { result } = renderHook(() => useHasLogsCache('prayers'), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });

  it('distinguishes prayers from fasts', async () => {
    client.setQueryData([...QUERY_KEYS.sawmHistoryPrefix, '1446-10-01', '1446-10-07'], [FAST_LOG]);
    const { result } = renderHook(() => useHasLogsCache('prayers'), {
      wrapper: makeWrapper(client),
    });
    await act(async () => {
      await Promise.resolve();
    });
    // sawm data should not affect prayers result
    expect(result.current).toBeNull();
  });
});

// ── useHasDailyLog ────────────────────────────────────────────────────────────

describe('useHasDailyLog', () => {
  let client: QueryClient;
  const DATE = '1446-10-01';

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns null when no query is cached for the date', () => {
    const { result } = renderHook(() => useHasDailyLog(DATE, 'prayers'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current).toBeNull();
  });

  it('returns true when the daily prayer query has items', () => {
    client.setQueryData(QUERY_KEYS.salahDailyLogs(DATE), [PRAYER_LOG]);
    const { result } = renderHook(() => useHasDailyLog(DATE, 'prayers'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current).toBe(true);
  });

  it('returns false when the daily prayer query is an empty array', () => {
    client.setQueryData(QUERY_KEYS.salahDailyLogs(DATE), []);
    const { result } = renderHook(() => useHasDailyLog(DATE, 'prayers'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current).toBe(false);
  });

  it('returns true when the daily fast query has items', () => {
    client.setQueryData(QUERY_KEYS.sawmDailyLog(DATE), [FAST_LOG]);
    const { result } = renderHook(() => useHasDailyLog(DATE, 'fasts'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current).toBe(true);
  });

  it('returns null when data is null', () => {
    client.setQueryData(QUERY_KEYS.salahDailyLogs(DATE), null);
    const { result } = renderHook(() => useHasDailyLog(DATE, 'prayers'), {
      wrapper: makeWrapper(client),
    });
    expect(result.current).toBeNull();
  });
});
