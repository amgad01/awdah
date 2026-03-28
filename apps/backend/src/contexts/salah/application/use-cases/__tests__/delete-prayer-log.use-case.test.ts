import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeletePrayerLogUseCase, DeletePrayerLogCommand } from '../delete-prayer-log.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';

describe('DeletePrayerLogUseCase', () => {
  let useCase: DeletePrayerLogUseCase;
  const mockRepo = {
    save: vi.fn(),
  } as unknown as IPrayerLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new DeletePrayerLogUseCase(mockRepo);
  });

  it('successfully records a deselected action instead of deleting', async () => {
    const command: DeletePrayerLogCommand = {
      userId: 'user-1',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'obligatory',
    };

    await useCase.execute(command);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const savedLog = vi.mocked(mockRepo.save).mock.calls[0]![0] as {
      userId: string;
      action: string;
      type: { getValue(): string };
      eventId: string;
    };
    expect(savedLog.userId).toBe(command.userId);
    expect(savedLog.action).toBe('deselected');
    expect(savedLog.type.getValue()).toBe(command.type);
    expect(savedLog.eventId).toBeDefined();
    expect(savedLog.eventId).not.toBe('obligatory');
  });
});
