import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AddPracticingPeriodUseCase,
  AddPracticingPeriodCommand,
} from '../add-practicing-period.use-case';
import { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';
import { HijriDate, ValidationError } from '@awdah/shared';

describe('AddPracticingPeriodUseCase', () => {
  let useCase: AddPracticingPeriodUseCase;
  const mockRepo = {
    save: vi.fn(),
    findByUser: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
  } as unknown as IPracticingPeriodRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AddPracticingPeriodUseCase(mockRepo);
  });

  const command: AddPracticingPeriodCommand = {
    userId: 'user-1',
    startDate: '1445-01-01',
    endDate: '1445-01-05',
    type: 'salah',
  };

  it('successfully adds a new practicing period', async () => {
    vi.mocked(mockRepo.findByUser).mockResolvedValue([]);

    const periodId = await useCase.execute(command);

    expect(periodId).toBeDefined();
    expect(mockRepo.save).toHaveBeenCalled();
    const saveCall = vi.mocked(mockRepo.save).mock.calls[0];
    const savedPeriod = saveCall ? saveCall[0] : null;
    expect(savedPeriod).not.toBeNull();
    if (savedPeriod) {
      expect(savedPeriod.userId).toBe(command.userId);
      expect(savedPeriod.startDate.toString()).toBe(command.startDate);
    }
  });

  it('throws ValidationError if period overlaps with existing one', async () => {
    const existingPeriod = new PracticingPeriod({
      userId: 'user-1',
      periodId: 'existing-1',
      startDate: HijriDate.fromString('1445-01-01'),
      endDate: HijriDate.fromString('1445-01-10'),
      type: 'salah',
    });

    vi.mocked(mockRepo.findByUser).mockResolvedValue([existingPeriod]);

    await expect(useCase.execute(command)).rejects.toThrow(ValidationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
