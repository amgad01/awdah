import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserSettingsUseCase } from '../get-user-settings.use-case';
import {
  IUserRepository,
  UserSettings,
} from '../../../../shared/domain/repositories/user.repository';
import { HijriDate, NotFoundError, UserId, ERROR_CODES } from '@awdah/shared';

describe('GetUserSettingsUseCase', () => {
  const mockRepo: IUserRepository = {
    findById: vi.fn(),
    save: vi.fn(),
  };

  const useCase = new GetUserSettingsUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns settings when user exists', async () => {
    const expectedSettings: UserSettings = {
      userId: new UserId('user-123'),
      bulughDate: HijriDate.fromString('1431-09-15'),
      gender: 'male',
    };
    vi.mocked(mockRepo.findById).mockResolvedValue(expectedSettings);

    const result = await useCase.execute('user-123');

    expect(mockRepo.findById).toHaveBeenCalledWith(expect.any(UserId));
    expect(result).toBe(expectedSettings);
  });

  it('throws when user does not exist', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('unknown-user')).rejects.toThrow(
      new NotFoundError(ERROR_CODES.USER_SETTINGS_NOT_FOUND),
    );
    expect(mockRepo.findById).toHaveBeenCalledWith(expect.any(UserId));
  });
});
