import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HijriDate } from '@awdah/shared';
import { GetPrayerHistoryPageUseCase } from '../get-prayer-history-page.use-case';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';
import { PrayerName } from '../../../domain/value-objects/prayer-name';
import { LogType } from '../../../../shared/domain/value-objects/log-type';
import type { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { encodeCursor } from '../../../../../shared/infrastructure/persistence/cursor';

describe('GetPrayerHistoryPageUseCase', () => {
  const mockRepo = {
    findPageByUserAndDateRange: vi.fn(),
  } as unknown as IPrayerLogRepository;

  const useCase = new GetPrayerHistoryPageUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped DTOs and pagination metadata', async () => {
    const loggedAt = new Date('2025-01-01T00:00:00.000Z');
    vi.mocked(mockRepo.findPageByUserAndDateRange).mockResolvedValueOnce({
      items: [
        new PrayerLog({
          userId: 'user-1',
          eventId: 'event-1',
          date: HijriDate.fromString('1445-09-01'),
          prayerName: new PrayerName('fajr'),
          type: new LogType('qadaa'),
          action: 'prayed',
          loggedAt,
        }),
      ],
      nextCursor: encodeCursor({ userId: 'user-1', sk: '1445-09-01#FAJR#cursor-1' }),
    });

    const result = await useCase.execute({
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-30',
      limit: 50,
    });

    expect(mockRepo.findPageByUserAndDateRange).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      expect.anything(),
      { limit: 50, cursor: undefined },
    );
    expect(result).toEqual({
      items: [
        {
          eventId: 'event-1',
          date: '1445-09-01',
          prayerName: 'fajr',
          type: 'qadaa',
          action: 'prayed',
          loggedAt: loggedAt.toISOString(),
        },
      ],
      nextCursor: encodeCursor({
        key: { userId: 'user-1', sk: '1445-09-01#FAJR#cursor-1' },
        suppressedSlotKey: '1445-09-01#fajr#qadaa',
      }),
      hasMore: true,
    });
  });

  it('marks hasMore false when the repository returns no next cursor', async () => {
    vi.mocked(mockRepo.findPageByUserAndDateRange).mockResolvedValueOnce({
      items: [],
    });

    const result = await useCase.execute({
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-30',
      limit: 50,
      cursor: encodeCursor({ userId: 'user-1', sk: '1445-09-01#FAJR#cursor-0' }),
    });

    expect(result).toEqual({
      items: [],
      nextCursor: undefined,
      hasMore: false,
    });
  });

  it('suppresses a slot that was already resolved on the previous page', async () => {
    const deselectedLoggedAt = new Date('2025-01-03T00:00:00.000Z');
    const prayedLoggedAt = new Date('2025-01-02T00:00:00.000Z');
    const freshLoggedAt = new Date('2025-01-01T00:00:00.000Z');

    vi.mocked(mockRepo.findPageByUserAndDateRange).mockResolvedValueOnce({
      items: [
        new PrayerLog({
          userId: 'user-1',
          eventId: 'event-2',
          date: HijriDate.fromString('1445-09-01'),
          prayerName: new PrayerName('fajr'),
          type: new LogType('qadaa'),
          action: 'deselected',
          loggedAt: deselectedLoggedAt,
        }),
        new PrayerLog({
          userId: 'user-1',
          eventId: 'event-1',
          date: HijriDate.fromString('1445-09-01'),
          prayerName: new PrayerName('fajr'),
          type: new LogType('qadaa'),
          action: 'prayed',
          loggedAt: prayedLoggedAt,
        }),
        new PrayerLog({
          userId: 'user-1',
          eventId: 'event-3',
          date: HijriDate.fromString('1445-09-02'),
          prayerName: new PrayerName('dhuhr'),
          type: new LogType('qadaa'),
          action: 'prayed',
          loggedAt: freshLoggedAt,
        }),
      ],
    });

    const previousPageCursor = Buffer.from(
      JSON.stringify({
        key: { userId: 'user-1', sk: '1445-09-01#FAJR#cursor' },
        suppressedSlotKey: '1445-09-01#fajr#qadaa',
      }),
      'utf8',
    ).toString('base64url');

    const result = await useCase.execute({
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-30',
      limit: 50,
      cursor: previousPageCursor,
    });

    expect(result.items).toEqual([
      {
        eventId: 'event-3',
        date: '1445-09-02',
        prayerName: 'dhuhr',
        type: 'qadaa',
        action: 'prayed',
        loggedAt: freshLoggedAt.toISOString(),
      },
    ]);
  });
});
