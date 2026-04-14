import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPracticingPeriodsUseCase } from '../get-practicing-periods.use-case';
import { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';
import { HijriDate, UserId, PeriodId } from '@awdah/shared';

describe('GetPracticingPeriodsUseCase', () => {
  const mockRepo: IPracticingPeriodRepository = {
    findByUser: vi.fn(),
    findById: vi.fn(),
    save: vi.fn(),
    saveAtomic: vi.fn(),
    delete: vi.fn(),
  } as unknown as IPracticingPeriodRepository;

  const useCase = new GetPracticingPeriodsUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userId = new UserId('user-1');

  it('returns mapped DTOs for each period', async () => {
    const period = new PracticingPeriod({
      userId,
      periodId: new PeriodId('period-1'),
      startDate: HijriDate.fromString('1445-01-01'),
      endDate: HijriDate.fromString('1446-01-01'),
      type: 'salah',
    });
    vi.mocked(mockRepo.findByUser).mockResolvedValue([period]);

    const result = await useCase.execute('user-1');

    expect(mockRepo.findByUser).toHaveBeenCalledWith(expect.any(UserId));
    expect(result).toHaveLength(1);
    expect(result[0]!.periodId).toBe('period-1');
    expect(result[0]!.startDate).toBe('1445-01-01');
    expect(result[0]!.endDate).toBe('1446-01-01');
    expect(result[0]!.type).toBe('salah');
  });

  it('returns an empty array when there are no periods', async () => {
    vi.mocked(mockRepo.findByUser).mockResolvedValue([]);

    const result = await useCase.execute('user-1');

    expect(result).toEqual([]);
  });

  it('omits endDate for an open-ended period', async () => {
    const period = new PracticingPeriod({
      userId,
      periodId: new PeriodId('period-2'),
      startDate: HijriDate.fromString('1445-01-01'),
      type: 'salah',
    });
    vi.mocked(mockRepo.findByUser).mockResolvedValue([period]);

    const result = await useCase.execute('user-1');

    expect(result[0]!.endDate).toBeUndefined();
  });
});
