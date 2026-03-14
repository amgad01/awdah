import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSalahDebtUseCase } from '../get-salah-debt.use-case';
import { SalahDebtCalculator } from '../../../domain/services/debt-calculator.service';
import { HijriDate } from '@awdah/shared';

describe('GetSalahDebtUseCase', () => {
  const mockUserRepo = { findById: vi.fn(), save: vi.fn() };
  const mockLogRepo = {
    save: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    deleteEntry: vi.fn(),
  };
  const mockPeriodRepo = { save: vi.fn(), findByUser: vi.fn(), delete: vi.fn() };
  const mockCalendar = { daysBetween: vi.fn(), getRamadanDays: vi.fn(), today: vi.fn() };

  const calculator = new SalahDebtCalculator(mockCalendar);
  const useCase = new GetSalahDebtUseCase(
    mockUserRepo,
    mockLogRepo,
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
    mockLogRepo.countQadaaCompleted.mockResolvedValue(100);
    mockCalendar.today.mockReturnValue(today);
    mockCalendar.daysBetween.mockReturnValue(1800); // ~5 years

    const result = await useCase.execute('u');

    expect(result.totalPrayersOwed).toBe(1800 * 5);
    expect(result.completedPrayers).toBe(100);
    expect(result.remainingPrayers).toBe(1800 * 5 - 100);

    expect(mockUserRepo.findById).toHaveBeenCalledWith('u');
    expect(mockPeriodRepo.findByUser).toHaveBeenCalledWith('u');
    expect(mockLogRepo.countQadaaCompleted).toHaveBeenCalledWith('u');
  });

  it('throws NotFoundError if user settings missing', async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('u')).rejects.toThrow('User settings for u not found');
  });
});
