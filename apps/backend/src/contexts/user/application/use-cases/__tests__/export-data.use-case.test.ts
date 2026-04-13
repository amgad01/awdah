import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserId, EventId } from '@awdah/shared';
import { ExportDataUseCase, ExportDataCommand } from '../export-data.use-case';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';

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
      type: 'export',
      status: 'pending',
      requestedAt: '2026-03-23T00:00:00.000Z',
      expiresAt: 1,
    });

    const command: ExportDataCommand = { userId: 'user-1' };
    const result = await useCase.execute(command);

    expect(mockJobRepository.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(UserId),
        jobId: expect.any(EventId),
        type: 'export',
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: expect.any(UserId),
      jobId: expect.any(EventId),
    });
    expect(result.jobId.toString()).toBe('job-1');
  });
});
