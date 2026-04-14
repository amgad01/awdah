import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetUserLifecycleJobStatusUseCase,
  GetUserLifecycleJobStatusCommand,
} from '../get-user-lifecycle-job-status.use-case';
import type { IUserLifecycleJobRepository } from '../../../domain/repositories/user-lifecycle-job.repository';
import { NotFoundError, UserId, EventId } from '@awdah/shared';

describe('GetUserLifecycleJobStatusUseCase', () => {
  let useCase: GetUserLifecycleJobStatusUseCase;
  let jobRepo: IUserLifecycleJobRepository;

  const userId = new UserId('user-1');
  const jobId = new EventId('job-1');

  const command: GetUserLifecycleJobStatusCommand = {
    userId: 'user-1',
    jobId: 'job-1',
  };

  const existingJob = {
    userId,
    jobId,
    type: 'export' as const,
    status: 'completed' as const,
    requestedAt: '2026-03-23T00:00:00.000Z',
    expiresAt: 9999999999,
  };

  beforeEach(() => {
    jobRepo = {
      createJob: vi.fn(),
      findById: vi.fn().mockResolvedValue(existingJob),
      tryMarkProcessing: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      saveExportResult: vi.fn(),
      readExportResult: vi.fn(),
      markAuthDeleted: vi.fn(),
    } as unknown as IUserLifecycleJobRepository;
    useCase = new GetUserLifecycleJobStatusUseCase(jobRepo);
  });

  it('returns the lifecycle job when it exists', async () => {
    const result = await useCase.execute(command);

    expect(jobRepo.findById).toHaveBeenCalledWith(expect.any(UserId), expect.any(EventId));
    expect(result).toEqual(existingJob);
  });

  it('throws NotFoundError when the job does not exist', async () => {
    vi.mocked(jobRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });
});
