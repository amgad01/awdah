import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserId, EventId } from '@awdah/shared';
import { DeleteAccountUseCase, DeleteAccountCommand } from '../delete-account.use-case';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';

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
  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('job-1'),
  };

  const useCase = new DeleteAccountUseCase(mockJobRepository, mockDispatcher, mockIdGenerator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const command: DeleteAccountCommand = { userId: 'user-1' };

  it('creates a pending delete-account job and dispatches it for background processing', async () => {
    const userId = new UserId('user-1');
    const jobId = new EventId('job-1');

    vi.mocked(mockJobRepository.createJob).mockResolvedValue({
      userId,
      jobId,
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
        userId: expect.any(UserId),
        jobId: expect.any(EventId),
        type: 'delete-account',
        authCleanupRequired: true,
        authDeleted: false,
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: expect.any(UserId),
      jobId: expect.any(EventId),
    });
    expect(result.jobId.toString()).toBe('job-1');
    expect(result.userId.toString()).toBe('user-1');
  });
});
