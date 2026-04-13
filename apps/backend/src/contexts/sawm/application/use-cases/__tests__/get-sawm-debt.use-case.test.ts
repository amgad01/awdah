import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSawmDebtUseCase } from '../get-sawm-debt.use-case';
import { SawmDebtCalculator } from '../../../domain/services/sawm-debt-calculator.service';
import { HijriDate, UserId } from '@awdah/shared';
import type {
  IUserRepository,
  UserSettings,
} from '../../../../shared/domain/repositories/user.repository';
import type { IFastLogRepository } from '../../../domain/repositories/fast-log.repository';
import type { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import type { IHijriCalendarService } from '../../../../shared/domain/services/hijri-calendar.service';

describe('GetSawmDebtUseCase', () => {
  const mockUserRepo = {
    findById: vi.fn(),
    save: vi.fn(),
    deleteAccount: vi.fn(),
    exportData: vi.fn(),
  } as unknown as IUserRepository;
  const mockFastLogRepo = {
    save: vi.fn(),
    findByUserAndDate: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findPageByUserAndDateRange: vi.fn(),
    countQadaaCompleted: vi.fn(),
    deleteEntry: vi.fn(),
  } as unknown as IFastLogRepository;
  const mockPeriodRepo = {
    save: vi.fn(),
    saveAtomic: vi.fn(),
    findByUser: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as IPracticingPeriodRepository;
  const mockCalendar: IHijriCalendarService = {
    daysBetween: vi.fn(),
    getRamadanDays: vi.fn(),
    today: vi.fn(),
  };

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

  const userId = new UserId('u');

  it('orchestrates data fetching and calculation correctly', async () => {
    const bulugh = new HijriDate(1440, 1, 1);
    const today = new HijriDate(1445, 1, 1);

    const settings: UserSettings = {
      userId,
      bulughDate: bulugh,
      gender: 'male',
    };
    vi.mocked(mockUserRepo.findById).mockResolvedValue(settings);
    vi.mocked(mockPeriodRepo.findByUser).mockResolvedValue([]);
    vi.mocked(mockFastLogRepo.countQadaaCompleted).mockResolvedValue(10);
    vi.mocked(mockCalendar.today).mockReturnValue(today);
    vi.mocked(mockCalendar.getRamadanDays).mockReturnValue(30);
    vi.mocked(mockCalendar.daysBetween).mockReturnValue(30); // Mock days per Ramadan overlap

    const result = await useCase.execute('u');

    expect(result.totalDaysOwed).toBe(150);
    expect(result.completedDays).toBe(10);
    expect(result.remainingDays).toBe(140);

    expect(mockUserRepo.findById).toHaveBeenCalledWith(expect.any(UserId));
    expect(mockPeriodRepo.findByUser).toHaveBeenCalledWith(expect.any(UserId));
    expect(mockFastLogRepo.countQadaaCompleted).toHaveBeenCalledWith(expect.any(UserId));
  });

  it('throws NotFoundError if user settings missing', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute('u')).rejects.toThrow('User settings not found');
  });

  it('returns zero debt when bulugh date is in the future', async () => {
    const futureBulugh = new HijriDate(1450, 1, 1); // Future date
    const today = new HijriDate(1445, 1, 1);

    const settings: UserSettings = {
      userId,
      bulughDate: futureBulugh,
      gender: 'male',
    };
    vi.mocked(mockUserRepo.findById).mockResolvedValue(settings);
    vi.mocked(mockPeriodRepo.findByUser).mockResolvedValue([]);
    vi.mocked(mockFastLogRepo.countQadaaCompleted).mockResolvedValue(0);
    vi.mocked(mockCalendar.today).mockReturnValue(today);

    const result = await useCase.execute('u');

    expect(result.totalDaysOwed).toBe(0);
    expect(result.completedDays).toBe(0);
    expect(result.remainingDays).toBe(0);
  });

  it('returns zero debt when revert date is in the future (for reverts)', async () => {
    const pastBulugh = new HijriDate(1440, 1, 1);
    const futureRevert = new HijriDate(1450, 1, 1); // Future revert date
    const today = new HijriDate(1445, 1, 1);

    const settings: UserSettings = {
      userId,
      bulughDate: pastBulugh,
      revertDate: futureRevert,
      gender: 'male',
    };
    vi.mocked(mockUserRepo.findById).mockResolvedValue(settings);
    vi.mocked(mockPeriodRepo.findByUser).mockResolvedValue([]);
    vi.mocked(mockFastLogRepo.countQadaaCompleted).mockResolvedValue(0);
    vi.mocked(mockCalendar.today).mockReturnValue(today);

    const result = await useCase.execute('u');

    expect(result.totalDaysOwed).toBe(0);
    expect(result.completedDays).toBe(0);
    expect(result.remainingDays).toBe(0);
  });
});
