import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventId, HijriDate, UserId } from '@awdah/shared';
import { LogFastUseCase } from '../log-fast.use-case';
import type { IFastLogRepository } from '../../../domain/repositories/fast-log.repository';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';
import { FastLog } from '../../../domain/entities/fast-log.entity';
import { LogType } from '../../../../shared/domain/value-objects/log-type';

describe('LogFastUseCase', () => {
  const mockRepo = {
    save: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findPageByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    deleteEntry: vi.fn(),
  } as unknown as IFastLogRepository;

  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('event-1'),
  };

  const useCase = new LogFastUseCase(mockRepo, mockIdGenerator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully logs a fast with a unique eventId', async () => {
    vi.mocked(mockRepo.findByUserAndDate).mockResolvedValue([]);

    await useCase.execute({ userId: 'user-1', date: '1445-09-01', type: 'obligatory' });

    expect(mockRepo.save).toHaveBeenCalledOnce();
    const saved = vi.mocked(mockRepo.save).mock.calls[0]![0];
    expect(saved.userId.toString()).toBe('user-1');
    expect(saved.date.toString()).toBe('1445-09-01');
    expect(saved.type.getValue()).toBe('obligatory');
    expect(saved.eventId).toBeInstanceOf(EventId);
    expect(saved.eventId.toString()).toBe('event-1');
  });

  it('treats duplicate submissions for the same date and type as idempotent', async () => {
    const existing = new FastLog({
      userId: new UserId('user-1'),
      eventId: new EventId('existing-event'),
      date: HijriDate.fromString('1445-09-01'),
      type: new LogType('qadaa'),
      loggedAt: new Date(),
    });
    vi.mocked(mockRepo.findByUserAndDate)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([existing]);

    await useCase.execute({ userId: 'user-1', date: '1445-09-01', type: 'qadaa' });
    await useCase.execute({ userId: 'user-1', date: '1445-09-01', type: 'qadaa' });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('logs a qadaa fast without debt validation', async () => {
    vi.mocked(mockRepo.findByUserAndDate).mockResolvedValue([]);

    await useCase.execute({ userId: 'user-1', date: '1445-09-01', type: 'qadaa' });

    expect(mockRepo.save).toHaveBeenCalledOnce();
  });
});
