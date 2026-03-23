import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFastHistoryUseCase, GetFastHistoryCommand } from '../get-fast-history.use-case';
import { IFastLogRepository } from '../../../domain/repositories/fast-log.repository';
import { FastLog } from '../../../domain/entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';
import { LogType } from '../../../../shared/domain/value-objects/log-type';

describe('GetFastHistoryUseCase', () => {
  const mockRepo: IFastLogRepository = {
    save: vi.fn(),
    deleteEntry: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findPageByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    clearAll: vi.fn(),
  };

  const useCase = new GetFastHistoryUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped DTOs for fasts within the date range', async () => {
    const log = new FastLog({
      userId: 'user-1',
      eventId: 'evt-1',
      date: HijriDate.fromString('1445-09-10'),
      type: new LogType('qadaa'),
      loggedAt: new Date('2024-01-01T10:00:00.000Z'),
    });
    vi.mocked(mockRepo.findByUserAndDateRange).mockResolvedValue([log]);

    const command: GetFastHistoryCommand = {
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-30',
    };

    const result = await useCase.execute(command);

    expect(mockRepo.findByUserAndDateRange).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      expect.anything(),
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.eventId).toBe('evt-1');
    expect(result[0]!.date).toBe('1445-09-10');
    expect(result[0]!.type).toBe('qadaa');
  });

  it('returns an empty array when no fasts are found', async () => {
    vi.mocked(mockRepo.findByUserAndDateRange).mockResolvedValue([]);

    const result = await useCase.execute({
      userId: 'user-1',
      startDate: '1445-09-01',
      endDate: '1445-09-30',
    });

    expect(result).toEqual([]);
  });
});
