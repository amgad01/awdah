import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResetPrayerLogsUseCase } from '../reset-prayer-logs.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';

describe('ResetPrayerLogsUseCase', () => {
  let useCase: ResetPrayerLogsUseCase;
  const mockRepo = {
    clearAll: vi.fn(),
  } as unknown as IPrayerLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ResetPrayerLogsUseCase(mockRepo);
  });

  it('should call clearAll on the repository with correct userId', async () => {
    const userId = 'user-1';
    await useCase.execute({ userId });

    expect(mockRepo.clearAll).toHaveBeenCalledWith(userId);
    expect(mockRepo.clearAll).toHaveBeenCalledTimes(1);
  });
});
