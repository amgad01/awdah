import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessUserLifecycleJobUseCase } from '../process-user-lifecycle-job.use-case';
import type { IUserDataLifecycleService } from '../../../domain/services/user-data-lifecycle.service.interface';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';

describe('ProcessUserLifecycleJobUseCase', () => {
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

  const mockLifecycleService: IUserDataLifecycleService = {
    deleteUserData: vi.fn(),
    exportUserData: vi.fn(),
  };

  const useCase = new ProcessUserLifecycleJobUseCase(mockJobRepository, mockLifecycleService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports user data, stores the result chunks, and marks the job completed', async () => {
    vi.mocked(mockJobRepository.tryMarkProcessing).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'export',
      status: 'processing',
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      expiresAt: 1,
    });
    vi.mocked(mockLifecycleService.exportUserData).mockResolvedValue({
      userId: 'user-1',
      prayerLogs: [],
    });
    vi.mocked(mockJobRepository.saveExportResult).mockResolvedValue({ chunkCount: 1 });
    vi.mocked(mockJobRepository.markCompleted).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'export',
      status: 'completed',
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      completedAt: '2026-03-23T00:00:12.000Z',
      expiresAt: 1,
      exportChunkCount: 1,
      exportContentType: 'application/json;charset=utf-8',
      exportFileName: 'awdah-data-export-2026-03-23.json',
    });

    const result = await useCase.execute({ userId: 'user-1', jobId: 'job-1' });

    expect(mockLifecycleService.exportUserData).toHaveBeenCalledWith('user-1');
    expect(mockJobRepository.saveExportResult).toHaveBeenCalledWith(
      'user-1',
      'job-1',
      expect.objectContaining({
        contentType: 'application/json;charset=utf-8',
      }),
    );
    expect(mockJobRepository.markCompleted).toHaveBeenCalledWith(
      'user-1',
      'job-1',
      expect.objectContaining({
        exportChunkCount: 1,
      }),
    );
    expect(result?.status).toBe('completed');
  });

  it('deletes user data and marks delete-account jobs completed with auth cleanup pending', async () => {
    vi.mocked(mockJobRepository.tryMarkProcessing).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'delete-account',
      status: 'processing',
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });
    vi.mocked(mockJobRepository.markCompleted).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'delete-account',
      status: 'completed',
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      completedAt: '2026-03-23T00:00:12.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });

    const result = await useCase.execute({ userId: 'user-1', jobId: 'job-1' });

    expect(mockLifecycleService.deleteUserData).toHaveBeenCalledWith('user-1');
    expect(mockJobRepository.markCompleted).toHaveBeenCalledWith(
      'user-1',
      'job-1',
      expect.objectContaining({
        authCleanupRequired: true,
        authDeleted: false,
      }),
    );
    expect(result?.status).toBe('completed');
  });

  it('marks jobs failed when background processing throws', async () => {
    vi.mocked(mockJobRepository.tryMarkProcessing).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'delete-account',
      status: 'processing',
      requestedAt: '2026-03-23T00:00:00.000Z',
      startedAt: '2026-03-23T00:00:10.000Z',
      expiresAt: 1,
      authCleanupRequired: true,
      authDeleted: false,
    });
    vi.mocked(mockLifecycleService.deleteUserData).mockRejectedValue(new Error('delete failed'));

    await expect(useCase.execute({ userId: 'user-1', jobId: 'job-1' })).rejects.toThrow(
      'delete failed',
    );

    expect(mockJobRepository.markFailed).toHaveBeenCalledWith(
      'user-1',
      'job-1',
      expect.any(String),
      'delete failed',
    );
  });
});
