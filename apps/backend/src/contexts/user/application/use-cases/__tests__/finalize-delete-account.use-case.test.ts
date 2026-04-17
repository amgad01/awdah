import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, UserId, EventId } from '@awdah/shared';
import { FinalizeDeleteAccountUseCase } from '../finalize-delete-account.use-case';
import type { ICognitoAdminService } from '../../../domain/services/cognito-admin.service.interface';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJobType,
  UserLifecycleJobStatus,
} from '../../../domain/repositories/user-lifecycle-job.repository';

describe('FinalizeDeleteAccountUseCase', () => {
  const mockJobRepository: IUserLifecycleJobRepository = {
    createJob: vi.fn(),
    findById: vi.fn(),
    findRecentJobByType: vi.fn(),
    tryMarkProcessing: vi.fn(),
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
    saveExportResult: vi.fn(),
    readExportResult: vi.fn(),
    markAuthDeleted: vi.fn(),
  };

  const mockCognitoService: ICognitoAdminService = {
    deleteUser: vi.fn(),
  };

  const useCase = new FinalizeDeleteAccountUseCase(mockJobRepository, mockCognitoService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userId = new UserId('user-1');
  const jobId = new EventId('job-1');

  it('deletes auth access once the data-deletion job has completed', async () => {
    vi.mocked(mockJobRepository.findById).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.DeleteAccount,
      status: UserLifecycleJobStatus.Completed,
      requestedAt: '2026-03-23T00:00:00.000Z',
      completedAt: '2026-03-23T00:00:30.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });
    vi.mocked(mockJobRepository.markAuthDeleted).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.DeleteAccount,
      status: UserLifecycleJobStatus.Completed,
      requestedAt: '2026-03-23T00:00:00.000Z',
      completedAt: '2026-03-23T00:00:30.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: true,
      authCleanupCompletedAt: '2026-03-23T00:01:00.000Z',
    });

    const result = await useCase.execute({ userId: 'user-1', jobId: 'job-1' });

    expect(mockCognitoService.deleteUser).toHaveBeenCalledWith(expect.any(UserId));
    expect(mockJobRepository.markAuthDeleted).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.any(EventId),
      expect.any(String),
    );
    expect(result).toEqual({ authDeleted: true });
  });

  it('returns partial success if auth deletion still fails', async () => {
    vi.mocked(mockJobRepository.findById).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.DeleteAccount,
      status: UserLifecycleJobStatus.Completed,
      requestedAt: '2026-03-23T00:00:00.000Z',
      completedAt: '2026-03-23T00:00:30.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });
    vi.mocked(mockCognitoService.deleteUser).mockRejectedValue(new Error('cognito unavailable'));

    const result = await useCase.execute({ userId: 'user-1', jobId: 'job-1' });

    expect(result).toEqual({ authDeleted: false });
    expect(mockJobRepository.markAuthDeleted).not.toHaveBeenCalled();
  });

  it('throws if the deletion job is still in progress', async () => {
    vi.mocked(mockJobRepository.findById).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.DeleteAccount,
      status: UserLifecycleJobStatus.Processing,
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });

    await expect(useCase.execute({ userId: 'user-1', jobId: 'job-1' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('throws when the job does not exist', async () => {
    vi.mocked(mockJobRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'user-1', jobId: 'job-1' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
