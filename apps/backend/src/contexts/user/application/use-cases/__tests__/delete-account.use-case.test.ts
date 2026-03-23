import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteAccountUseCase, DeleteAccountCommand } from '../delete-account.use-case';
import { IUserRepository } from '../../../../shared/domain/repositories/user.repository';
import { ICognitoAdminService } from '../../../domain/services/cognito-admin.service.interface';

describe('DeleteAccountUseCase', () => {
  const mockUserRepo: IUserRepository = {
    findById: vi.fn(),
    save: vi.fn(),
    deleteAccount: vi.fn(),
    exportData: vi.fn(),
  };

  const mockCognitoService: ICognitoAdminService = {
    deleteUser: vi.fn(),
  };

  const useCase = new DeleteAccountUseCase(mockUserRepo, mockCognitoService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const command: DeleteAccountCommand = { userId: 'user-1' };

  it('deletes DynamoDB data then removes Cognito user', async () => {
    const result = await useCase.execute(command);

    // DynamoDB deletion must come first (GDPR priority)
    expect(mockUserRepo.deleteAccount).toHaveBeenCalledWith(command.userId);
    expect(mockCognitoService.deleteUser).toHaveBeenCalledWith(command.userId);
    expect(result.authDeleted).toBe(true);
  });

  it('returns a partial-success result if Cognito deletion fails after DynamoDB deletion succeeds', async () => {
    vi.mocked(mockCognitoService.deleteUser).mockRejectedValue(new Error('Cognito unavailable'));

    const result = await useCase.execute(command);
    expect(mockUserRepo.deleteAccount).toHaveBeenCalledWith(command.userId);
    expect(result.authDeleted).toBe(false);
    expect(result.message).toContain('identity cleanup');
  });

  it('throws if DynamoDB deletion fails — does not proceed to Cognito', async () => {
    vi.mocked(mockUserRepo.deleteAccount).mockRejectedValue(new Error('DynamoDB error'));

    await expect(useCase.execute(command)).rejects.toThrow('DynamoDB error');
    // Cognito must not be touched if DynamoDB step failed
    expect(mockCognitoService.deleteUser).not.toHaveBeenCalled();
  });
});
