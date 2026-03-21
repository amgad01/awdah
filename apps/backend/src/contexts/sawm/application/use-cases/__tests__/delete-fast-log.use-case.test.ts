import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteFastLogUseCase, DeleteFastLogCommand } from '../delete-fast-log.use-case';
import { IFastLogRepository } from '../../../domain/repositories/fast-log.repository';

describe('DeleteFastLogUseCase', () => {
  const mockRepo: IFastLogRepository = {
    save: vi.fn(),
    deleteEntry: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
  };

  const useCase = new DeleteFastLogUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to repository.deleteEntry with correct args', async () => {
    const command: DeleteFastLogCommand = {
      userId: 'user-1',
      date: '1445-09-10',
      eventId: 'evt-abc',
    };

    await useCase.execute(command);

    expect(mockRepo.deleteEntry).toHaveBeenCalledWith(
      command.userId,
      expect.anything(), // HijriDate instance
      command.eventId,
    );
  });
});
