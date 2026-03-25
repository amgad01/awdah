import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResetFastLogsUseCase } from '../reset-fast-logs.use-case';
import { IFastLogRepository } from '../../../domain/repositories/fast-log.repository';

describe('ResetFastLogsUseCase', () => {
  let useCase: ResetFastLogsUseCase;
  const mockRepo = {
    clearAll: vi.fn(),
  } as unknown as IFastLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ResetFastLogsUseCase(mockRepo);
  });

  it('should call clearAll on the repository with correct userId', async () => {
    const userId = 'user-1';
    await useCase.execute({ userId });

    expect(mockRepo.clearAll).toHaveBeenCalledWith(userId);
    expect(mockRepo.clearAll).toHaveBeenCalledTimes(1);
  });
});
