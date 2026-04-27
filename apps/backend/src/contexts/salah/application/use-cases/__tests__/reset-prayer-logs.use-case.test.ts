import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserId, EventId, RateLimitError } from '@awdah/shared';
import { ResetPrayerLogsUseCase } from '../reset-prayer-logs.use-case';
import type {
  IUserLifecycleJobRepository,
  UserLifecycleJob,
} from '../../../../user/domain/repositories/user-lifecycle-job.repository';
import type { IUserLifecycleJobDispatcher } from '../../../../user/domain/services/user-lifecycle-job-dispatcher.service.interface';
import type { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';

describe('ResetPrayerLogsUseCase', () => {
  const mockJobRepo = {
    createJob: vi.fn(),
    findRecentJobByType: vi.fn().mockResolvedValue(null),
  } as unknown as IUserLifecycleJobRepository;

  const mockDispatcher: IUserLifecycleJobDispatcher = {
    dispatch: vi.fn(),
  };

  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('job-1'),
  };

  const mockPrayerLogRepo: IPrayerLogRepository = {
    hasAnyLogs: vi.fn().mockResolvedValue(true),
  } as unknown as IPrayerLogRepository;

  const useCase = new ResetPrayerLogsUseCase(
    mockJobRepo,
    mockDispatcher,
    mockIdGenerator,
    mockPrayerLogRepo,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to default state
    vi.mocked(mockPrayerLogRepo.hasAnyLogs).mockResolvedValue(true);
    vi.mocked(mockJobRepo.findRecentJobByType).mockResolvedValue(null);
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
    expect(result!.type).toBe('reset-prayers');
    expect(result!.userId.toString()).toBe('user-1');
  });

  it('returns null when user has no prayer logs (idempotent no-op)', async () => {
    vi.mocked(mockPrayerLogRepo.hasAnyLogs).mockResolvedValue(false);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result).toBeNull();
    expect(mockJobRepo.createJob).not.toHaveBeenCalled();
    expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('throws RateLimitError when a recent reset job exists', async () => {
    const recentJob: UserLifecycleJob = {
      userId: new UserId('user-1'),
      jobId: new EventId('job-1'),
      type: 'reset-prayers',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    vi.mocked(mockJobRepo.findRecentJobByType).mockResolvedValue(recentJob);

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(RateLimitError);
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
      'RESET_PRAYERS_RATE_LIMITED',
    );

    expect(mockJobRepo.createJob).not.toHaveBeenCalled();
    expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('propagates errors from createJob', async () => {
    vi.mocked(mockJobRepo.createJob).mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow('Database error');
    expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
  });
});
