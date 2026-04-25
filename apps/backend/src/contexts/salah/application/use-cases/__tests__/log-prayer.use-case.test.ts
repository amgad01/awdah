import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogPrayerUseCase, type LogPrayerCommand } from '../log-prayer.use-case';
import type { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';
import { UserId, EventId, HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../domain/value-objects/prayer-name';
import { LogType } from '../../../../shared/domain/value-objects/log-type';

describe('LogPrayerUseCase', () => {
  let useCase: LogPrayerUseCase;
  let repository: IPrayerLogRepository;
  let idGenerator: IIdGenerator;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
      findByUserAndDate: vi.fn(),
      findByUserAndDateRange: vi.fn(),
      countQadaaCompleted: vi.fn(),
      countQadaaCompletedByPrayer: vi.fn(),
      deleteEntry: vi.fn(),
    } as unknown as IPrayerLogRepository;

    idGenerator = { generate: vi.fn().mockReturnValue('mock-ulid') };

    useCase = new LogPrayerUseCase(repository, idGenerator);

    // Default mock behavior
    vi.mocked(repository.findByUserAndDate).mockResolvedValue([]);
  });

  it('saves a prayer log with correct fields', async () => {
    const command: LogPrayerCommand = {
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'obligatory',
    };

    await useCase.execute(command);

    expect(repository.save).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(repository.save).mock.calls[0]![0] as PrayerLog;
    expect(saved.userId.toString()).toBe(command.userId);
    expect(saved.date.toString()).toBe(command.date);
    expect(saved.prayerName.getValue()).toBe(command.prayerName);
    expect(saved.type.getValue()).toBe(command.type);
    expect(saved.action).toBe('prayed');
    expect(saved.eventId.toString()).toBe('mock-ulid');
  });

  it('treats duplicate submissions for the same date, prayer, and type as idempotent', async () => {
    const existing = new PrayerLog({
      userId: new UserId('user-123'),
      eventId: new EventId('existing-event'),
      date: HijriDate.fromString('1445-09-01'),
      prayerName: new PrayerName('fajr'),
      type: new LogType('qadaa'),
      action: 'prayed',
      loggedAt: new Date(),
    });

    vi.mocked(repository.findByUserAndDate).mockResolvedValue([existing]);

    await useCase.execute({
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'qadaa',
    });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('saves a qadaa prayer without debt validation', async () => {
    await useCase.execute({
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'qadaa',
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('generates a unique event id for every prayer log', async () => {
    vi.mocked(idGenerator.generate).mockReturnValueOnce('id-1').mockReturnValueOnce('id-2');

    await useCase.execute({
      userId: 'u',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'obligatory',
    });
    await useCase.execute({
      userId: 'u',
      date: '1445-09-01',
      prayerName: 'dhuhr',
      type: 'obligatory',
    });

    const ids = vi
      .mocked(repository.save)
      .mock.calls.map((c) => (c[0] as PrayerLog).eventId.toString());
    expect(ids).toEqual(['id-1', 'id-2']);
  });
});
