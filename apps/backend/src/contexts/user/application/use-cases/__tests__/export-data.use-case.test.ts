import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportDataUseCase, ExportDataCommand } from '../export-data.use-case';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../domain/services/user-lifecycle-job-dispatcher.service.interface';

describe('ExportDataUseCase', () => {
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

  const useCase = new ExportDataUseCase(mockJobRepository, mockDispatcher);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a pending export job and dispatches it for background processing', async () => {
    vi.mocked(mockJobRepository.createJob).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'export',
      status: 'pending',
      requestedAt: '2026-03-23T00:00:00.000Z',
      expiresAt: 1,
    });

    const command: ExportDataCommand = { userId: 'user-1' };
    const result = await useCase.execute(command);

    expect(mockJobRepository.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: command.userId,
        type: 'export',
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: command.userId,
      jobId: 'job-1',
    });
    expect(result.jobId).toBe('job-1');
  });
});
