import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UpdatePracticingPeriodUseCase,
  UpdatePracticingPeriodCommand,
} from '../update-practicing-period.use-case';
import type { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import type { IUserRepository } from '../../../../shared/domain/repositories/user.repository';
import {
  HijriDate,
  UserId,
  PeriodId,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@awdah/shared';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';

describe('UpdatePracticingPeriodUseCase', () => {
  let useCase: UpdatePracticingPeriodUseCase;
  let periodRepo: IPracticingPeriodRepository;
  let userRepo: IUserRepository;

  const userSettings = {
    userId: new UserId('user-1'),
    dateOfBirth: HijriDate.fromString('1415-01-01'),
    bulughDate: HijriDate.fromString('1430-01-01'),
    gender: 'male' as const,
  };

  const existingPeriod = new PracticingPeriod({
    userId: new UserId('user-1'),
    periodId: new PeriodId('period-1'),
    startDate: HijriDate.fromString('1440-01-01'),
    endDate: HijriDate.fromString('1442-01-01'),
    type: 'both',
  });

  beforeEach(() => {
    periodRepo = {
      save: vi.fn(),
      saveAtomic: vi.fn(),
      findByUser: vi.fn().mockResolvedValue([existingPeriod]),
      findById: vi.fn().mockResolvedValue(existingPeriod),
      delete: vi.fn(),
    } as unknown as IPracticingPeriodRepository;
    userRepo = {
      findById: vi.fn().mockResolvedValue(userSettings),
      save: vi.fn(),
    } as unknown as IUserRepository;
    useCase = new UpdatePracticingPeriodUseCase(periodRepo, userRepo);
  });

  const baseCommand: UpdatePracticingPeriodCommand = {
    userId: 'user-1',
    periodId: 'period-1',
    startDate: '1441-01-01',
    endDate: '1443-01-01',
    type: 'both',
  };

  it('updates an existing period successfully', async () => {
    await useCase.execute(baseCommand);

    expect(periodRepo.save).toHaveBeenCalledTimes(1);
    const savedPeriod = vi.mocked(periodRepo.save).mock.calls[0]![0] as PracticingPeriod;
    expect(savedPeriod.startDate.toString()).toBe('1441-01-01');
    expect(savedPeriod.endDate?.toString()).toBe('1443-01-01');
  });

  it('throws NotFoundError when period does not exist', async () => {
    vi.mocked(periodRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(baseCommand)).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when user settings do not exist', async () => {
    vi.mocked(userRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(baseCommand)).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when start date is before date of birth', async () => {
    const command: UpdatePracticingPeriodCommand = {
      ...baseCommand,
      startDate: '1410-01-01',
    };

    await expect(useCase.execute(command)).rejects.toThrow(ValidationError);
  });

  it('throws ConflictError when updated period overlaps with another', async () => {
    const otherPeriod = new PracticingPeriod({
      userId: new UserId('user-1'),
      periodId: new PeriodId('period-2'),
      startDate: HijriDate.fromString('1442-06-01'),
      endDate: HijriDate.fromString('1444-01-01'),
      type: 'both',
    });
    vi.mocked(periodRepo.findByUser).mockResolvedValue([existingPeriod, otherPeriod]);

    const command: UpdatePracticingPeriodCommand = {
      ...baseCommand,
      startDate: '1441-01-01',
      endDate: '1443-01-01',
    };

    await expect(useCase.execute(command)).rejects.toThrow(ConflictError);
  });

  it('allows updating a period without an end date (open-ended)', async () => {
    const command: UpdatePracticingPeriodCommand = {
      ...baseCommand,
      endDate: undefined,
    };

    await useCase.execute(command);

    const savedPeriod = vi.mocked(periodRepo.save).mock.calls[0]![0] as PracticingPeriod;
    expect(savedPeriod.isOpenEnded).toBe(true);
  });
});
