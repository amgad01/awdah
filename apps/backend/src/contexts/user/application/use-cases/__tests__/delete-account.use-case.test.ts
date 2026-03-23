import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteAccountUseCase, DeleteAccountCommand } from '../delete-account.use-case';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../domain/services/user-lifecycle-job-dispatcher.service.interface';

describe('DeleteAccountUseCase', () => {
  const mockJobRepository: IUserLifecycleJobRepository = {
    createJob: vi.fn(),
    findById: vi.fn(),
    tryMarkProcessing: vi.fn(),
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
    saveExportResult: vi.fn(),
    readExportResult: vi.fn(),
    markAuthDeleted: vi.fn(),
  };
  const mockDispatcher: IUserLifecycleJobDispatcher = {
    dispatch: vi.fn(),
  };

  const useCase = new DeleteAccountUseCase(mockJobRepository, mockDispatcher);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const command: DeleteAccountCommand = { userId: 'user-1' };

  it('creates a pending delete-account job and dispatches it for background processing', async () => {
    vi.mocked(mockJobRepository.createJob).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'delete-account',
      status: 'pending',
      requestedAt: '2026-03-23T00:00:00.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });

    const result = await useCase.execute(command);

    expect(mockJobRepository.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: command.userId,
        type: 'delete-account',
        authCleanupRequired: true,
        authDeleted: false,
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: command.userId,
      jobId: 'job-1',
    });
    expect(result.jobId).toBe('job-1');
  });
});
