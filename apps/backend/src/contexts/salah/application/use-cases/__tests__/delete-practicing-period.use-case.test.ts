import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DeletePracticingPeriodUseCase,
  DeletePracticingPeriodCommand,
} from '../delete-practicing-period.use-case';
import { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import { UserId, PeriodId } from '@awdah/shared';

describe('DeletePracticingPeriodUseCase', () => {
  const mockRepo = {
    save: vi.fn(),
    saveAtomic: vi.fn(),
    findByUser: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as IPracticingPeriodRepository;

  const useCase = new DeletePracticingPeriodUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to repository.delete with correct userId and periodId', async () => {
    const command: DeletePracticingPeriodCommand = {
      userId: 'user-1',
      periodId: 'period-abc',
    };

    await useCase.execute(command);

    expect(mockRepo.delete).toHaveBeenCalledWith(expect.any(UserId), expect.any(PeriodId));
  });

  it('is idempotent — does not throw if the item does not exist', async () => {
    vi.mocked(mockRepo.delete).mockResolvedValue(undefined);

    await expect(
      useCase.execute({ userId: 'user-1', periodId: 'does-not-exist' }),
    ).resolves.toBeUndefined();
  });
});
