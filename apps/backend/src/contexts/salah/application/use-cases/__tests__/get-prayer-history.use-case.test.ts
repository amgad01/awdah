import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetPrayerHistoryUseCase, GetPrayerHistoryCommand } from '../get-prayer-history.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../domain/value-objects/prayer-name';
import { LogType } from '../../../../shared/domain/value-objects/log-type';

describe('GetPrayerHistoryUseCase', () => {
  let useCase: GetPrayerHistoryUseCase;
  const mockRepo = {
    findByUserAndDateRange: vi.fn(),
  } as unknown as IPrayerLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GetPrayerHistoryUseCase(mockRepo);
  });

  it('successfully retrieves prayer history for a date range as plain DTOs', async () => {
    const command: GetPrayerHistoryCommand = {
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-07',
    };

    const loggedAt = new Date('2025-01-01T00:00:00.000Z');
    const mockResults = [
      new PrayerLog({
        userId: 'user-1',
        eventId: 'event-1',
        date: HijriDate.fromString('1445-09-01'),
        prayerName: new PrayerName('fajr'),
        type: new LogType('obligatory'),
        loggedAt,
      }),
    ];
    vi.mocked(mockRepo.findByUserAndDateRange).mockResolvedValue(mockResults);

    const results = await useCase.execute(command);

    expect(results).toEqual([
      {
        eventId: 'event-1',
        date: '1445-09-01',
        prayerName: 'fajr',
        type: 'obligatory',
        loggedAt: loggedAt.toISOString(),
      },
    ]);
    expect(mockRepo.findByUserAndDateRange).toHaveBeenCalled();
  });
});
