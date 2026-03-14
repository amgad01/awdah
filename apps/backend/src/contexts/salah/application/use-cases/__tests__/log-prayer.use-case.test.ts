import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogPrayerUseCase, LogPrayerCommand } from '../log-prayer.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';

describe('LogPrayerUseCase', () => {
  const mockRepo: IPrayerLogRepository = {
    save: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    deleteEntry: vi.fn(),
  };

  const useCase = new LogPrayerUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates and saves a prayer log correctly', async () => {
    const command: LogPrayerCommand = {
      userId: 'user-123',
      date: '1445-01-01',
      prayerName: 'fajr',
      type: 'obligatory',
    };

    await useCase.execute(command);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const savedLog = vi.mocked(mockRepo.save).mock.calls[0]![0] as PrayerLog;

    expect(savedLog.userId).toBe('user-123');
    expect(savedLog.prayerName.getValue()).toBe('fajr');
    expect(savedLog.type.isObligatory()).toBe(true);
    expect(savedLog.date.toString()).toBe('1445-01-01');
  });

  it('throws validation error for invalid prayer name', async () => {
    const command: LogPrayerCommand = {
      userId: 'user-123',
      date: '1445-01-01',
      prayerName: 'not-a-prayer',
      type: 'obligatory',
    };

    await expect(useCase.execute(command)).rejects.toThrow('Invalid prayer name: not-a-prayer');
  });
});
