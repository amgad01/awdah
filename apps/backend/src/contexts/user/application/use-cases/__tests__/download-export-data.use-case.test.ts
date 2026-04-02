import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DownloadExportDataUseCase,
  DownloadExportDataCommand,
} from '../download-export-data.use-case';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';
import { NotFoundError, ConflictError } from '@awdah/shared';

describe('DownloadExportDataUseCase', () => {
  let useCase: DownloadExportDataUseCase;
  let jobRepo: IUserLifecycleJobRepository;

  const command: DownloadExportDataCommand = {
    userId: 'user-1',
    jobId: 'job-1',
  };

  const completedExportJob = {
    userId: 'user-1',
    jobId: 'job-1',
    type: 'export' as const,
    status: 'completed' as const,
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

    expect(jobRepo.findById).toHaveBeenCalledWith('user-1', 'job-1');
    expect(jobRepo.readExportResult).toHaveBeenCalledWith('user-1', 'job-1');
    expect(result).toEqual(exportDownload);
  });

  it('throws NotFoundError when job does not exist', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when job is not an export type', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue({
      ...completedExportJob,
      type: 'delete-account' as const,
    });

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when export job has failed', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue({
      ...completedExportJob,
      status: 'failed' as const,
      errorMessage: 'Something went wrong',
    });

    await expect(useCase.execute(command)).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when export is still processing', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue({
      ...completedExportJob,
      status: 'processing' as const,
    });

    await expect(useCase.execute(command)).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError when export data is not available', async () => {
    vi.mocked(jobRepo.readExportResult).mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });
});
