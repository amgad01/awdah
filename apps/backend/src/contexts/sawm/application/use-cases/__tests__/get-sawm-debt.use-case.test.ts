import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSawmDebtUseCase } from '../get-sawm-debt.use-case';
import { SawmDebtCalculator } from '../../../domain/services/sawm-debt-calculator.service';
import { HijriDate } from '@awdah/shared';

describe('GetSawmDebtUseCase', () => {
  const mockUserRepo = {
    findById: vi.fn(),
    save: vi.fn(),
    deleteAccount: vi.fn(),
    exportData: vi.fn(),
  };
  const mockFastLogRepo = {
    save: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findPageByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    deleteEntry: vi.fn(),
  };
  const mockPeriodRepo = { save: vi.fn(), findByUser: vi.fn(), findById: vi.fn(), delete: vi.fn() };
  const mockCalendar = { daysBetween: vi.fn(), getRamadanDays: vi.fn(), today: vi.fn() };

  const calculator = new SawmDebtCalculator(mockCalendar);
  const useCase = new GetSawmDebtUseCase(
    mockUserRepo,
    mockFastLogRepo,
    mockPeriodRepo,
    calculator,
    mockCalendar,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orchestrates data fetching and calculation correctly', async () => {
    const bulugh = new HijriDate(1440, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    mockUserRepo.findById.mockResolvedValue({ userId: 'u', bulughDate: bulugh, gender: 'male' });
    mockPeriodRepo.findByUser.mockResolvedValue([]);
    mockFastLogRepo.countQadaaCompleted.mockResolvedValue(10);
    mockCalendar.today.mockReturnValue(today);
    mockCalendar.getRamadanDays.mockReturnValue(30);
    mockCalendar.daysBetween.mockReturnValue(30); // Mock days per Ramadan overlap

    const result = await useCase.execute('u');

    expect(result.totalDaysOwed).toBe(150);
    expect(result.completedDays).toBe(10);
    expect(result.remainingDays).toBe(140);

    expect(mockUserRepo.findById).toHaveBeenCalledWith('u');
    expect(mockPeriodRepo.findByUser).toHaveBeenCalledWith('u');
    expect(mockFastLogRepo.countQadaaCompleted).toHaveBeenCalledWith('u');
  });

  it('throws NotFoundError if user settings missing', async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('u')).rejects.toThrow('User settings not found');
  });
});
