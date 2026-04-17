import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserId, EventId, RateLimitError } from '@awdah/shared';
import { ExportDataUseCase, ExportDataCommand } from '../export-data.use-case';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJobType,
  UserLifecycleJobStatus,
} from '../../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';

describe('ExportDataUseCase', () => {
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
  const mockDispatcher: IUserLifecycleJobDispatcher = {
    dispatch: vi.fn(),
  };
  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('job-1'),
  };

  const useCase = new ExportDataUseCase(mockJobRepository, mockDispatcher, mockIdGenerator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a pending export job and dispatches it for background processing', async () => {
    const userId = new UserId('user-1');
    const jobId = new EventId('job-1');

    vi.mocked(mockJobRepository.createJob).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.Export,
      status: UserLifecycleJobStatus.Pending,
      requestedAt: '2026-03-23T00:00:00.000Z',
      expiresAt: 1,
    });

    const command: ExportDataCommand = { userId: 'user-1' };
    const result = await useCase.execute(command);

    expect(mockJobRepository.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(UserId),
        jobId: expect.any(EventId),
        type: UserLifecycleJobType.Export,
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: expect.any(UserId),
      jobId: expect.any(EventId),
    });
    expect(result.jobId.toString()).toBe('job-1');
  });

  it('throws RateLimitError when a recent export job exists within cooldown period', async () => {
    const userId = new UserId('user-1');
    const recentJob = {
      userId,
      jobId: new EventId('job-recent'),
      type: UserLifecycleJobType.Export,
      status: UserLifecycleJobStatus.Pending,
      requestedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    vi.mocked(mockJobRepository.findRecentJobByType).mockResolvedValue(recentJob);

    const command: ExportDataCommand = { userId: 'user-1' };

    await expect(useCase.execute(command)).rejects.toThrow(RateLimitError);
    await expect(useCase.execute(command)).rejects.toThrow(
      'Please wait 10 minutes between data exports',
    );
    expect(mockJobRepository.createJob).not.toHaveBeenCalled();
    expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('allows export when no recent job exists (outside cooldown period)', async () => {
    const userId = new UserId('user-1');
    const jobId = new EventId('job-1');

    vi.mocked(mockJobRepository.findRecentJobByType).mockResolvedValue(null);
    vi.mocked(mockJobRepository.createJob).mockResolvedValue({
      userId,
      jobId,
      type: UserLifecycleJobType.Export,
      status: UserLifecycleJobStatus.Pending,
      requestedAt: '2026-03-23T00:00:00.000Z',
      expiresAt: 1,
    });

    const command: ExportDataCommand = { userId: 'user-1' };
    const result = await useCase.execute(command);

    expect(mockJobRepository.findRecentJobByType).toHaveBeenCalledWith(
      expect.any(UserId),
      UserLifecycleJobType.Export,
      expect.any(String),
    );
    expect(mockJobRepository.createJob).toHaveBeenCalled();
    expect(result.jobId.toString()).toBe('job-1');
  });
});
