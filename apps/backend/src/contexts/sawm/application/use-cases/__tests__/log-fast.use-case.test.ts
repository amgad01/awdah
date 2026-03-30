import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogFastUseCase } from '../log-fast.use-case';

describe('LogFastUseCase', () => {
  const mockRepo = {
    save: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findPageByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    deleteEntry: vi.fn(),
  };

  const useCase = new LogFastUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully logs a fast with a unique eventId', async () => {
    const command = {
      userId: 'user-1',
      date: '1445-09-01',
      type: 'obligatory',
    };

    await useCase.execute(command);

    expect(mockRepo.save).toHaveBeenCalledOnce();
    const savedLog = mockRepo.save.mock.calls[0]![0];
    expect(savedLog.userId).toBe('user-1');
    expect(savedLog.date.toString()).toBe('1445-09-01');
    expect(savedLog.type.getValue()).toBe('obligatory');
    expect(savedLog.eventId).toBeTypeOf('string');
    expect(savedLog.eventId.length).toBeGreaterThan(0);
    expect(savedLog.eventId).not.toBe('obligatory');
  });

  it('generates unique eventIds for multiple logs on the same date', async () => {
    const command = {
      userId: 'user-1',
      date: '1445-09-01',
      type: 'qadaa',
    };

    await useCase.execute(command);
    await useCase.execute(command);

    expect(mockRepo.save).toHaveBeenCalledTimes(2);
    const firstId = mockRepo.save.mock.calls[0]![0].eventId;
    const secondId = mockRepo.save.mock.calls[1]![0].eventId;
    expect(firstId).not.toBe(secondId);
  });
});
