import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserId, EventId } from '@awdah/shared';
import { ResetPrayerLogsUseCase } from '../reset-prayer-logs.use-case';
import type { IUserLifecycleJobRepository } from '../../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';

describe('ResetPrayerLogsUseCase', () => {
  const mockJobRepo = {
    createJob: vi.fn(),
  } as unknown as IUserLifecycleJobRepository;

  const mockDispatcher: IUserLifecycleJobDispatcher = {
    dispatch: vi.fn(),
  };

  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('job-1'),
  };

  const useCase = new ResetPrayerLogsUseCase(mockJobRepo, mockDispatcher, mockIdGenerator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a reset-prayers lifecycle job and dispatches it', async () => {
    const userId = new UserId('user-1');
    const jobId = new EventId('job-1');

    vi.mocked(mockJobRepo.createJob).mockResolvedValue({
      userId,
      jobId,
      type: 'reset-prayers',
      status: 'pending',
      requestedAt: '2026-03-29T00:00:00.000Z',
      expiresAt: 1,
    });

    const result = await useCase.execute({ userId: 'user-1' });

    expect(mockJobRepo.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(UserId),
        type: 'reset-prayers',
      }),
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith({
      userId: expect.any(UserId),
      jobId: expect.any(EventId),
    });
    expect(result.type).toBe('reset-prayers');
    expect(result.userId.toString()).toBe('user-1');
  });
});
