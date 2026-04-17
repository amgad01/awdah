import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserId, EventId } from '@awdah/shared';
import { ProcessUserLifecycleJobUseCase } from '../process-user-lifecycle-job.use-case';
import type { IUserDataLifecycleService } from '../../../domain/services/user-data-lifecycle.service.interface';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJobType,
  UserLifecycleJobStatus,
} from '../../../domain/repositories/user-lifecycle-job.repository';
import type { IDeletedUsersRepository } from '../../../domain/repositories/deleted-users.repository';

describe('ProcessUserLifecycleJobUseCase', () => {
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

  const mockLifecycleService: IUserDataLifecycleService = {
    deleteUserData: vi.fn(),
    exportUserData: vi.fn(),
    resetPrayerLogs: vi.fn(),
    resetFastLogs: vi.fn(),
  };

  const mockDeletedUsersRepo: IDeletedUsersRepository = {
    recordDeletion: vi.fn(),
    listAll: vi.fn(),
  };

  const useCase = new ProcessUserLifecycleJobUseCase(
    mockJobRepository,
    mockLifecycleService,
    mockDeletedUsersRepo,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userId = new UserId('user-1');
  const jobId = new EventId('job-1');

  it('exports user data, stores the result chunks, and marks the job completed', async () => {
    vi.mocked(mockJobRepository.tryMarkProcessing).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.Export,
      status: UserLifecycleJobStatus.Processing,
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      expiresAt: 1,
    });
    vi.mocked(mockLifecycleService.exportUserData).mockResolvedValue({
      userId: userId.toString(),
      prayerLogs: [],
    });
    vi.mocked(mockJobRepository.saveExportResult).mockResolvedValue({ chunkCount: 1 });
    vi.mocked(mockJobRepository.markCompleted).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.Export,
      status: UserLifecycleJobStatus.Completed,
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      completedAt: '2026-03-23T00:00:12.000Z',
      expiresAt: 1,
      exportChunkCount: 1,
      exportContentType: 'application/json;charset=utf-8',
      exportFileName: 'awdah-data-export-2026-03-23.json',
    });

    const result = await useCase.execute({ userId, jobId });

    expect(mockLifecycleService.exportUserData).toHaveBeenCalledWith(expect.any(UserId));
    expect(mockJobRepository.saveExportResult).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.any(EventId),
      expect.objectContaining({
        contentType: 'application/json;charset=utf-8',
      }),
    );
    expect(mockJobRepository.markCompleted).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.any(EventId),
      expect.objectContaining({
        exportChunkCount: 1,
      }),
    );
    expect(mockDeletedUsersRepo.recordDeletion).not.toHaveBeenCalled();
    expect(result?.status).toBe(UserLifecycleJobStatus.Completed);
  });

  it('deletes user data and marks delete-account jobs completed with auth cleanup pending', async () => {
    vi.mocked(mockJobRepository.tryMarkProcessing).mockResolvedValue({
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
    vi.mocked(mockJobRepository.markCompleted).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.DeleteAccount,
      status: UserLifecycleJobStatus.Completed,
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      completedAt: '2026-03-23T00:00:12.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });

    const result = await useCase.execute({ userId, jobId });

    expect(mockLifecycleService.deleteUserData).toHaveBeenCalledWith(expect.any(UserId));
    expect(mockDeletedUsersRepo.recordDeletion).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.any(String),
      expect.any(Number),
    );
    expect(mockJobRepository.markCompleted).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.any(EventId),
      expect.objectContaining({
        authCleanupRequired: true,
        authDeleted: false,
      }),
    );
    expect(result?.status).toBe(UserLifecycleJobStatus.Completed);
  });

  it('marks jobs failed when background processing throws', async () => {
    vi.mocked(mockJobRepository.tryMarkProcessing).mockResolvedValue({
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
    vi.mocked(mockLifecycleService.deleteUserData).mockRejectedValue(new Error('delete failed'));

    await expect(useCase.execute({ userId, jobId })).rejects.toThrow('delete failed');

    expect(mockJobRepository.markFailed).toHaveBeenCalledWith(
      expect.any(UserId),
      expect.any(EventId),
      expect.any(String),
      'delete failed',
    );
  });
});
