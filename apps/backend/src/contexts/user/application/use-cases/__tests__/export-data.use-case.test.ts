import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportDataUseCase, ExportDataCommand } from '../export-data.use-case';
import { IUserRepository } from '../../../../shared/domain/repositories/user.repository';

describe('ExportDataUseCase', () => {
  const mockRepo: IUserRepository = {
    findById: vi.fn(),
    save: vi.fn(),
    deleteAccount: vi.fn(),
    exportData: vi.fn(),
  };

  const useCase = new ExportDataUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data from the repository wrapped in the expected envelope', async () => {
    const mockData = { prayerLogs: [], fastLogs: [] };
    vi.mocked(mockRepo.exportData).mockResolvedValue(mockData);

    const command: ExportDataCommand = { userId: 'user-1' };
    const result = await useCase.execute(command);

    expect(mockRepo.exportData).toHaveBeenCalledWith(command.userId);
    expect(result.message).toBe('Data export successful');
    expect(result.data).toBe(mockData);
  });
});
