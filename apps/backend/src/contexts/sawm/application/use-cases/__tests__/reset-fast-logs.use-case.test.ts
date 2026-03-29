import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResetFastLogsUseCase } from '../reset-fast-logs.use-case';
import type { IUserLifecycleJobRepository } from '../../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';

describe('ResetFastLogsUseCase', () => {
  const mockJobRepo = {
    createJob: vi.fn(),
  } as unknown as IUserLifecycleJobRepository;

  const mockDispatcher: IUserLifecycleJobDispatcher = {
    dispatch: vi.fn(),
  };

  const useCase = new ResetFastLogsUseCase(mockJobRepo, mockDispatcher);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a reset-fasts lifecycle job and dispatches it', async () => {
    vi.mocked(mockJobRepo.createJob).mockResolvedValue({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'reset-fasts',
      status: 'pending',
      requestedAt: '2026-03-29T00:00:00.000Z',
      expiresAt: 1,
    });

    const result = await useCase.execute({ userId: 'user-1' });

    expect(mockJobRepo.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'reset-fasts',
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: 'user-1',
      jobId: 'job-1',
    });
    expect(result.type).toBe('reset-fasts');
  });
});
