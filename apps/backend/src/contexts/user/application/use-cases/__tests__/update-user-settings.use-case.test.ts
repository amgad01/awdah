import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UpdateUserSettingsUseCase,
  UpdateUserSettingsCommand,
} from '../update-user-settings.use-case';
import { IUserRepository } from '../../../../shared/domain/repositories/user.repository';

describe('UpdateUserSettingsUseCase', () => {
  const mockRepo: IUserRepository = {
    findById: vi.fn(),
    save: vi.fn(),
  };

  const useCase = new UpdateUserSettingsUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves settings with a parsed HijriDate', async () => {
    const command: UpdateUserSettingsCommand = {
      userId: 'user-123',
      bulughDate: '1431-09-15',
      gender: 'male',
    };

    await useCase.execute(command);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(mockRepo.save).mock.calls[0]![0];
    expect(saved.userId).toBe('user-123');
    expect(saved.gender).toBe('male');
    expect(saved.bulughDate.toString()).toBe('1431-09-15');
  });

  it('throws when the bulugh date string is malformed', async () => {
    const command: UpdateUserSettingsCommand = {
      userId: 'user-123',
      bulughDate: 'not-a-date',
      gender: 'female',
    };

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
