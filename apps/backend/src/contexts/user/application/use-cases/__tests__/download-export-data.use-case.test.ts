import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DownloadExportDataUseCase,
  DownloadExportDataCommand,
} from '../download-export-data.use-case';
import {
  IUserLifecycleJobRepository,
  UserLifecycleJobType,
  UserLifecycleJobStatus,
} from '../../../domain/repositories/user-lifecycle-job.repository';
import { NotFoundError, ConflictError, UserId, EventId } from '@awdah/shared';

describe('DownloadExportDataUseCase', () => {
  let useCase: DownloadExportDataUseCase;
  let jobRepo: IUserLifecycleJobRepository;

  const command: DownloadExportDataCommand = {
    userId: 'user-1',
    jobId: 'job-1',
  };

  const completedExportJob = {
    userId: new UserId('user-1'),
    jobId: new EventId('job-1'),
    type: UserLifecycleJobType.Export,
    status: UserLifecycleJobStatus.Completed,
    requestedAt: '2026-03-23T00:00:00.000Z',
    expiresAt: 9999999999,
  };

  const exportDownload = {
    fileName: 'export.json',
    contentType: 'application/json',
    data: { prayers: [], fasts: [], periods: [], settings: null },
  };

  beforeEach(() => {
    jobRepo = {
      createJob: vi.fn(),
      findById: vi.fn().mockResolvedValue(completedExportJob),
      findRecentJobByType: vi.fn(),
      tryMarkProcessing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      saveExportResult: vi.fn(),
      readExportResult: vi.fn().mockResolvedValue(exportDownload),
      markAuthDeleted: vi.fn(),
    };
    useCase = new DownloadExportDataUseCase(jobRepo);
  });

  it('returns export data for a completed export job', async () => {
    const result = await useCase.execute(command);

    expect(jobRepo.findById).toHaveBeenCalledWith(expect.any(UserId), expect.any(EventId));
    expect(jobRepo.readExportResult).toHaveBeenCalledWith(expect.any(UserId), expect.any(EventId));
    expect(result).toEqual(exportDownload);
  });

  it('throws NotFoundError when job does not exist', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when job is not an export type', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue({
      ...completedExportJob,
      type: UserLifecycleJobType.DeleteAccount,
    });

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when export job has failed', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue({
      ...completedExportJob,
      status: UserLifecycleJobStatus.Failed,
      errorMessage: 'Something went wrong',
    });

    await expect(useCase.execute(command)).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when export is still processing', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue({
      ...completedExportJob,
      status: UserLifecycleJobStatus.Processing,
    });

    await expect(useCase.execute(command)).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError when export data is not available', async () => {
    vi.mocked(jobRepo.readExportResult).mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });
});
