import { describe, expect, it, vi } from 'vitest';
import {
  fetchCombinedHistoryPage,
  INITIAL_COMBINED_HISTORY_CURSOR,
} from '../combined-history-service';

describe('fetchCombinedHistoryPage', () => {
  it('merges prayer and fast pages by loggedAt descending order', async () => {
    const result = await fetchCombinedHistoryPage(
      '1447-01-01',
      '1447-01-07',
      INITIAL_COMBINED_HISTORY_CURSOR,
      undefined,
      {
        fetchPrayerPage: vi.fn().mockResolvedValue({
          items: [
            {
              eventId: 'p1',
              date: '1447-01-01',
              prayerName: 'fajr',
              type: 'qadaa',
              action: 'prayed',
              loggedAt: '2026-04-10T12:00:00.000Z',
            },
            {
              eventId: 'p2',
              date: '1447-01-02',
              prayerName: 'dhuhr',
              type: 'qadaa',
              action: 'prayed',
              loggedAt: '2026-04-10T10:00:00.000Z',
            },
          ],
          hasMore: false,
        }),
        fetchFastPage: vi.fn().mockResolvedValue({
          items: [
            {
              eventId: 'f1',
              date: '1447-01-01',
              type: 'qadaa',
              action: 'fasted',
              loggedAt: '2026-04-10T11:00:00.000Z',
            },
          ],
          hasMore: false,
        }),
      },
    );

    expect(result.items.map((item) => item.eventId)).toEqual(['p1', 'f1', 'p2']);
    expect(result.items.map((item) => item.kind)).toEqual(['prayer', 'fast', 'prayer']);
    expect(result.hasMore).toBe(false);
  });
});
