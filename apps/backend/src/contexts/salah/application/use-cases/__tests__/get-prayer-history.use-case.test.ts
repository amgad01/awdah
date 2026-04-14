import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetPrayerHistoryUseCase, GetPrayerHistoryCommand } from '../get-prayer-history.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';
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
        userId: new UserId('user-1'),
        eventId: new EventId('event-1'),
        date: HijriDate.fromString('1445-09-01'),
        prayerName: new PrayerName('fajr'),
        type: new LogType('obligatory'),
        action: 'prayed',
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
        action: 'prayed',
        loggedAt: loggedAt.toISOString(),
      },
    ]);
    expect(mockRepo.findByUserAndDateRange).toHaveBeenCalled();
  });

  it('returns multiple qadaa entries per prayer per day (net prayed − deselected)', async () => {
    const command: GetPrayerHistoryCommand = {
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-01',
    };

    const ts = (offset: number) => new Date(Date.UTC(2025, 0, 1, 0, 0, offset));
    const mockResults = [
      new PrayerLog({
        userId: new UserId('user-1'),
        eventId: new EventId('q1'),
        date: HijriDate.fromString('1445-09-01'),
        prayerName: new PrayerName('fajr'),
        type: new LogType('qadaa'),
        action: 'prayed',
        loggedAt: ts(1),
      }),
      new PrayerLog({
        userId: new UserId('user-1'),
        eventId: new EventId('q2'),
        date: HijriDate.fromString('1445-09-01'),
        prayerName: new PrayerName('fajr'),
        type: new LogType('qadaa'),
        action: 'prayed',
        loggedAt: ts(2),
      }),
      new PrayerLog({
        userId: new UserId('user-1'),
        eventId: new EventId('q3'),
        date: HijriDate.fromString('1445-09-01'),
        prayerName: new PrayerName('fajr'),
        type: new LogType('qadaa'),
        action: 'prayed',
        loggedAt: ts(3),
      }),
      new PrayerLog({
        userId: new UserId('user-1'),
        eventId: new EventId('q4'),
        date: HijriDate.fromString('1445-09-01'),
        prayerName: new PrayerName('fajr'),
        type: new LogType('qadaa'),
        action: 'deselected',
        loggedAt: ts(4),
      }),
    ];
    vi.mocked(mockRepo.findByUserAndDateRange).mockResolvedValue(mockResults);

    const results = await useCase.execute(command);

    // 3 prayed − 1 deselected = net 2
    const qadaaResults = results.filter((r) => r.type === 'qadaa');
    expect(qadaaResults).toHaveLength(2);
    expect(qadaaResults.every((r) => r.prayerName === 'fajr')).toBe(true);
  });
});
