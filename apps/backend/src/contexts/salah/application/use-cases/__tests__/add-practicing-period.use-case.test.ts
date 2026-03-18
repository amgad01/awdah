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
import { HijriDate, NotFoundError, ValidationError } from '@awdah/shared';

const BULUGH_DATE = '1440-01-01';

describe('AddPracticingPeriodUseCase', () => {
  let useCase: AddPracticingPeriodUseCase;
  const mockRepo = {
    save: vi.fn(),
    findByUser: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as IPracticingPeriodRepository;

  const mockUserRepo = {
    findById: vi.fn(),
    save: vi.fn(),
  } as unknown as IUserRepository;

  const defaultUserSettings: UserSettings = {
    userId: 'user-1',
    bulughDate: HijriDate.fromString(BULUGH_DATE),
    gender: 'male',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockUserRepo.findById).mockResolvedValue(defaultUserSettings);
    useCase = new AddPracticingPeriodUseCase(mockRepo, mockUserRepo);
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

  it('throws ValidationError if start date is before bulugh date', async () => {
    const earlyCommand: AddPracticingPeriodCommand = {
      ...command,
      startDate: '1439-06-01', // before BULUGH_DATE 1440-01-01
    };

    vi.mocked(mockRepo.findByUser).mockResolvedValue([]);

    await expect(useCase.execute(earlyCommand)).rejects.toThrow(ValidationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if user settings are not found', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);
    vi.mocked(mockRepo.findByUser).mockResolvedValue([]);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
