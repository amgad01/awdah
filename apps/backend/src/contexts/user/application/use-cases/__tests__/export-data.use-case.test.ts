import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportDataUseCase, ExportDataCommand } from '../export-data.use-case';
import { IUserDataLifecycleService } from '../../../domain/services/user-data-lifecycle.service.interface';

describe('ExportDataUseCase', () => {
  const mockLifecycleService: IUserDataLifecycleService = {
    deleteUserData: vi.fn(),
    exportUserData: vi.fn(),
  };

  const useCase = new ExportDataUseCase(mockLifecycleService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exported data from the lifecycle service without transport wrapping', async () => {
    const mockData = { prayerLogs: [], fastLogs: [] };
    vi.mocked(mockLifecycleService.exportUserData).mockResolvedValue(mockData);

    const command: ExportDataCommand = { userId: 'user-1' };
    const result = await useCase.execute(command);

    expect(mockLifecycleService.exportUserData).toHaveBeenCalledWith(command.userId);
    expect(result).toBe(mockData);
  });
});
