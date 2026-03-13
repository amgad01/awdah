import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AddPracticingPeriodUseCase,
  AddPracticingPeriodCommand,
} from '../add-practicing-period.use-case';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';
import { HijriDate } from '@awdah/shared';

describe('AddPracticingPeriodUseCase', () => {
  const mockRepo = {
    save: vi.fn(),
    findByUser: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new AddPracticingPeriodUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a new period and returns its ID', async () => {
    mockRepo.findByUser.mockResolvedValue([]);
    const command: AddPracticingPeriodCommand = {
      userId: 'u',
      startDate: '1440-01-01',
      endDate: '1441-01-01',
      type: 'salah',
    };

    const periodId = await useCase.execute(command);

    expect(periodId).toBeDefined();
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(mockRepo.save).mock.calls[0]![0] as PracticingPeriod;
    expect(saved.startDate.toString()).toBe('1440-01-01');
  });

  it('throws error if new period overlaps with existing one', async () => {
    const existing = new PracticingPeriod({
      userId: 'u',
      periodId: 'p1',
      startDate: new HijriDate(1440, 1, 1),
      endDate: new HijriDate(1441, 1, 1),
      type: 'salah',
    });
    mockRepo.findByUser.mockResolvedValue([existing]);

    const command: AddPracticingPeriodCommand = {
      userId: 'u',
      startDate: '1440-06-01', // Overlaps
      endDate: '1442-01-01',
      type: 'salah',
    };

    await expect(useCase.execute(command)).rejects.toThrow(
      'The new practicing period overlaps with an existing one',
    );
  });
});
