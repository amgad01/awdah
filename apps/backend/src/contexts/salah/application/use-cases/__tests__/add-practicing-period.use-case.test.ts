import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AddPracticingPeriodUseCase,
  AddPracticingPeriodCommand,
} from '../add-practicing-period.use-case';
import { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import {
  IUserRepository,
  UserSettings,
} from '../../../../shared/domain/repositories/user.repository';
import { PracticingPeriod } from '../../../../shared/domain/entities/practicing-period.entity';
import { HijriDate, UserId, PeriodId, NotFoundError, ValidationError } from '@awdah/shared';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';

const BULUGH_DATE = '1440-01-01';

describe('AddPracticingPeriodUseCase', () => {
  let useCase: AddPracticingPeriodUseCase;
  const mockRepo = {
    save: vi.fn(),
    saveAtomic: vi.fn(),
    findByUser: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as IPracticingPeriodRepository;

  const mockUserRepo = {
    findById: vi.fn(),
    save: vi.fn(),
  } as unknown as IUserRepository;

  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('new-period-id'),
  };

  const defaultUserSettings: UserSettings = {
    userId: new UserId('user-1'),
    dateOfBirth: HijriDate.fromString('1425-01-01'),
    bulughDate: HijriDate.fromString(BULUGH_DATE),
    gender: 'male',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockUserRepo.findById).mockResolvedValue(defaultUserSettings);
    useCase = new AddPracticingPeriodUseCase(mockRepo, mockUserRepo, mockIdGenerator);
  });

  const command: AddPracticingPeriodCommand = {
    userId: 'user-1',
    startDate: '1445-01-01',
    endDate: '1445-01-05',
    type: 'salah',
  };

  it('successfully adds a new practicing period', async () => {
    vi.mocked(mockRepo.findByUser).mockResolvedValue([]);

    const result = await useCase.execute(command);

    expect(result.periodId).toBe('new-period-id');
    expect(mockRepo.save).toHaveBeenCalled();
    const savedPeriod = vi.mocked(mockRepo.save).mock.calls[0]?.[0];

    expect(savedPeriod).not.toBeNull();
    if (savedPeriod) {
      expect(savedPeriod.userId.toString()).toBe(command.userId);
      expect(savedPeriod.startDate.toString()).toBe(command.startDate);
    }
  });

  it('allows adding a period that overlaps with an existing one', async () => {
    const existingPeriod = new PracticingPeriod({
      userId: new UserId('user-1'),
      periodId: new PeriodId('existing-1'),
      startDate: HijriDate.fromString('1445-01-01'),
      endDate: HijriDate.fromString('1445-01-10'),
      type: 'salah',
    });

    vi.mocked(mockRepo.findByUser).mockResolvedValue([existingPeriod]);

    const result = await useCase.execute(command);
    expect(result.periodId).toBe('new-period-id');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('rejects a period starting before date of birth', async () => {
    const earlyCommand: AddPracticingPeriodCommand = {
      ...command,
      startDate: '1420-01-01', // before date of birth (1425)
    };

    const promise = useCase.execute(earlyCommand);
    await expect(promise).rejects.toThrow(ValidationError);
    await expect(promise).rejects.toThrow('PERIOD_BEFORE_DOB');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a period starting before revert date', async () => {
    const userWithRevert: UserSettings = {
      ...defaultUserSettings,
      revertDate: HijriDate.fromString('1440-01-01'),
    };
    vi.mocked(mockUserRepo.findById).mockResolvedValue(userWithRevert);

    const earlyCommand: AddPracticingPeriodCommand = {
      ...command,
      startDate: '1435-01-01', // before revert date (1440)
    };

    const promise = useCase.execute(earlyCommand);
    await expect(promise).rejects.toThrow(ValidationError);
    await expect(promise).rejects.toThrow('PERIOD_BEFORE_REVERT');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if user settings are not found', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);
    vi.mocked(mockRepo.findByUser).mockResolvedValue([]);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
