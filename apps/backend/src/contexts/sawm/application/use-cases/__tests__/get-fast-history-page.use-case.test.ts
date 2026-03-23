import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HijriDate } from '@awdah/shared';
import { GetFastHistoryPageUseCase } from '../get-fast-history-page.use-case';
import { FastLog } from '../../../domain/entities/fast-log.entity';
import { LogType } from '../../../../shared/domain/value-objects/log-type';
import type { IFastLogRepository } from '../../../domain/repositories/fast-log.repository';

describe('GetFastHistoryPageUseCase', () => {
  const mockRepo = {
    findPageByUserAndDateRange: vi.fn(),
  } as unknown as IFastLogRepository;

  const useCase = new GetFastHistoryPageUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped DTOs and pagination metadata', async () => {
    const loggedAt = new Date('2025-01-01T00:00:00.000Z');
    vi.mocked(mockRepo.findPageByUserAndDateRange).mockResolvedValueOnce({
      items: [
        new FastLog({
          userId: 'user-1',
          eventId: 'event-1',
          date: HijriDate.fromString('1445-09-01'),
          type: new LogType('qadaa'),
          loggedAt,
          breakReason: 'menstruation',
        }),
      ],
      nextCursor: 'cursor-1',
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
          type: 'qadaa',
          loggedAt: loggedAt.toISOString(),
          breakReason: 'menstruation',
        },
      ],
      nextCursor: 'cursor-1',
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
      cursor: 'cursor-0',
    });

    expect(result).toEqual({
      items: [],
      nextCursor: undefined,
      hasMore: false,
    });
  });
});
