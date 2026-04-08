import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetSalahDebtUseCase } from '../get-salah-debt.use-case';
import {
  IUserRepository,
  type UserSettings,
} from '../../../../shared/domain/repositories/user.repository';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import { SalahDebtCalculator } from '../../../domain/services/debt-calculator.service';
import { IHijriCalendarService } from '../../../../shared/domain/services/hijri-calendar.service';
import { HijriDate, AppError } from '@awdah/shared';

describe('GetSalahDebtUseCase', () => {
  let useCase: GetSalahDebtUseCase;
  let userRepository: IUserRepository;
  let prayerLogRepository: IPrayerLogRepository;
  let practicingPeriodRepository: IPracticingPeriodRepository;
  let debtCalculator: SalahDebtCalculator;
  let calendarService: IHijriCalendarService;

  beforeEach(() => {
    userRepository = { findById: vi.fn() } as unknown as IUserRepository;
    prayerLogRepository = {
      countQadaaCompleted: vi.fn(),
      countQadaaCompletedByPrayer: vi.fn(),
    } as unknown as IPrayerLogRepository;
    practicingPeriodRepository = {
      findByUser: vi.fn(),
      findById: vi.fn(),
    } as unknown as IPracticingPeriodRepository;
    calendarService = {
      today: vi.fn(),
      daysBetween: vi.fn().mockReturnValue(10),
    } as unknown as IHijriCalendarService;
    debtCalculator = new SalahDebtCalculator(calendarService);

    useCase = new GetSalahDebtUseCase(
      userRepository,
      prayerLogRepository,
      practicingPeriodRepository,
      debtCalculator,
      calendarService,
    );
  });

  it('should calculate debt correctly for a user', async () => {
    const userId = 'user-123';
    const bulgeDate = HijriDate.fromString('1430-01-01');
    const today = HijriDate.fromString('1445-09-01');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(userRepository.findById).mockResolvedValue({ userId, bulughDate: bulgeDate } as any);
    vi.mocked(practicingPeriodRepository.findByUser).mockResolvedValue([]);
    vi.mocked(prayerLogRepository.countQadaaCompleted).mockResolvedValue(100);
    vi.mocked(prayerLogRepository.countQadaaCompletedByPrayer).mockResolvedValue({
      fajr: 20,
      dhuhr: 20,
      asr: 20,
      maghrib: 20,
      isha: 20,
    });
    vi.mocked(calendarService.today).mockReturnValue(today);

    const result = await useCase.execute(userId);

    expect(result).toBeDefined();
    expect(result.totalPrayersOwed).toBeGreaterThan(0);
  });

  it('should throw AppError if user settings not found', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute('invalid')).rejects.toThrow(AppError);
  });

  it('should return zero debt when bulugh date is in the future', async () => {
    const userId = 'user-123';
    const futureBulugh = HijriDate.fromString('1450-01-01'); // Future date
    const today = HijriDate.fromString('1445-09-01');

    vi.mocked(userRepository.findById).mockResolvedValue({
      userId,
      bulughDate: futureBulugh,
      gender: 'male',
    } satisfies Pick<UserSettings, 'userId' | 'bulughDate' | 'gender'> as UserSettings);
    vi.mocked(practicingPeriodRepository.findByUser).mockResolvedValue([]);
    vi.mocked(prayerLogRepository.countQadaaCompleted).mockResolvedValue(0);
    vi.mocked(prayerLogRepository.countQadaaCompletedByPrayer).mockResolvedValue({
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
    vi.mocked(calendarService.today).mockReturnValue(today);

    const result = await useCase.execute(userId);

    expect(result.totalDaysMissed).toBe(0);
    expect(result.totalPrayersOwed).toBe(0);
    expect(result.remainingPrayers).toBe(0);
    expect(result.perPrayerRemaining).toEqual({
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
  });

  it('should return zero debt when revert date is in the future (for reverts)', async () => {
    const userId = 'user-123';
    const pastBulugh = HijriDate.fromString('1430-01-01');
    const futureRevert = HijriDate.fromString('1450-01-01'); // Future revert date
    const today = HijriDate.fromString('1445-09-01');

    vi.mocked(userRepository.findById).mockResolvedValue({
      userId,
      bulughDate: pastBulugh,
      revertDate: futureRevert,
      gender: 'male',
    } satisfies Pick<
      UserSettings,
      'userId' | 'bulughDate' | 'revertDate' | 'gender'
    > as UserSettings);
    vi.mocked(practicingPeriodRepository.findByUser).mockResolvedValue([]);
    vi.mocked(prayerLogRepository.countQadaaCompleted).mockResolvedValue(0);
    vi.mocked(prayerLogRepository.countQadaaCompletedByPrayer).mockResolvedValue({
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
    vi.mocked(calendarService.today).mockReturnValue(today);

    const result = await useCase.execute(userId);

    expect(result.totalDaysMissed).toBe(0);
    expect(result.totalPrayersOwed).toBe(0);
    expect(result.remainingPrayers).toBe(0);
  });
});
