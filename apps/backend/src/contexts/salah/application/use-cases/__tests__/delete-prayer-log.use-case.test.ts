import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeletePrayerLogUseCase, DeletePrayerLogCommand } from '../delete-prayer-log.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';

describe('DeletePrayerLogUseCase', () => {
  let useCase: DeletePrayerLogUseCase;
  const mockRepo = {
    deleteEntry: vi.fn(),
  } as unknown as IPrayerLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new DeletePrayerLogUseCase(mockRepo);
  });

  it('successfully deletes a prayer log entry', async () => {
    const command: DeletePrayerLogCommand = {
      userId: 'user-1',
      date: '1445-09-01',
      prayerName: 'fajr',
      eventId: 'evt-1',
    };

    await useCase.execute(command);

    expect(mockRepo.deleteEntry).toHaveBeenCalledWith(
      command.userId,
      expect.anything(),
      command.prayerName,
      command.eventId,
    );
  });
});
