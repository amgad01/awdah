import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeletePrayerLogUseCase, DeletePrayerLogCommand } from '../delete-prayer-log.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { UserId, EventId } from '@awdah/shared';
import { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';

describe('DeletePrayerLogUseCase', () => {
  let useCase: DeletePrayerLogUseCase;
  const mockRepo = {
    save: vi.fn(),
  } as unknown as IPrayerLogRepository;
  const mockIdGenerator: IIdGenerator = {
    generate: vi.fn().mockReturnValue('mock-event-id'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new DeletePrayerLogUseCase(mockRepo, mockIdGenerator);
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
    const savedLog = vi.mocked(mockRepo.save).mock.calls[0]![0] as PrayerLog;
    expect(savedLog.userId).toBeInstanceOf(UserId);
    expect(savedLog.userId.toString()).toBe(command.userId);
    expect(savedLog.action).toBe('deselected');
    expect(savedLog.type.getValue()).toBe(command.type);
    expect(savedLog.eventId).toBeInstanceOf(EventId);
    expect(savedLog.eventId.toString()).toBe('mock-event-id');
  });
});
