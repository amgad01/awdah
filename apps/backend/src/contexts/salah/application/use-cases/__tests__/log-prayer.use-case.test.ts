import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogPrayerUseCase, LogPrayerCommand } from '../log-prayer.use-case';
import { IPrayerLogRepository } from '../../../domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../domain/entities/prayer-log.entity';
import { IIdGenerator } from '../../../../../shared/domain/services/id-generator.interface';
import { IUserRepository } from '../../../../shared/domain/repositories/user.repository';
import { IPracticingPeriodRepository } from '../../../../shared/domain/repositories/practicing-period.repository';
import {
  SalahDebtCalculator,
  type SalahDebtResult,
} from '../../../domain/services/debt-calculator.service';
import { IHijriCalendarService } from '../../../../shared/domain/services/hijri-calendar.service';
import { HijriDate, ValidationError } from '@awdah/shared';

describe('LogPrayerUseCase', () => {
  let useCase: LogPrayerUseCase;
  let repository: IPrayerLogRepository;
  let idGenerator: IIdGenerator;
  let userRepo: IUserRepository;
  let periodRepo: IPracticingPeriodRepository;
  let calculator: SalahDebtCalculator;
  let calendarService: IHijriCalendarService;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
      findByUserAndDate: vi.fn(),
      findByUserAndDateRange: vi.fn(),
      countQadaaCompleted: vi.fn(),
      countQadaaCompletedByPrayer: vi.fn().mockResolvedValue({}),
      deleteEntry: vi.fn(),
    } as unknown as IPrayerLogRepository;

    idGenerator = {
      generate: vi.fn().mockReturnValue('mock-ulid'),
    };

    userRepo = {
      findById: vi.fn().mockResolvedValue({
        bulughDate: HijriDate.fromString('1430-01-01'),
      }),
      save: vi.fn(),
    } as unknown as IUserRepository;

    periodRepo = {
      findByUser: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
    } as unknown as IPracticingPeriodRepository;

    calendarService = {
      today: vi.fn().mockReturnValue(HijriDate.fromString('1445-01-01')),
      daysBetween: vi.fn(),
    } as unknown as IHijriCalendarService;

    calculator = {
      calculate: vi.fn().mockReturnValue({
        perPrayerRemaining: { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
      }),
    } as unknown as SalahDebtCalculator;

    useCase = new LogPrayerUseCase(
      repository,
      idGenerator,
      userRepo,
      periodRepo,
      calculator,
      calendarService,
    );
  });

  it('should successfully log a prayer', async () => {
    const command: LogPrayerCommand = {
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'obligatory',
    };

    await useCase.execute(command);

    expect(repository.save).toHaveBeenCalledTimes(1);
    const savedLog = vi.mocked(repository.save).mock.calls[0]![0] as PrayerLog;
    expect(savedLog.userId.toString()).toBe(command.userId);
    expect(savedLog.date.toString()).toBe(command.date);
    expect(savedLog.prayerName.getValue()).toBe(command.prayerName);
    expect(savedLog.type.getValue()).toBe(command.type);
    expect(savedLog.action).toBe('prayed');
  });

  it('should successfully log a qadaa prayer if debt exists', async () => {
    const command: LogPrayerCommand = {
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'qadaa',
    };

    await useCase.execute(command);

    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw ValidationError if logging qadaa while no debt remains', async () => {
    const debt: SalahDebtResult = {
      totalDaysMissed: 0,
      totalPrayersOwed: 0,
      completedPrayers: 0,
      remainingPrayers: 0,
      perPrayerRemaining: { fajr: 0, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
    };
    vi.mocked(calculator.calculate).mockReturnValue(debt);

    const command: LogPrayerCommand = {
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'qadaa',
    };

    await expect(useCase.execute(command)).rejects.toThrow(ValidationError);
    await expect(useCase.execute(command)).rejects.toThrow('salah.error_no_qadaa_owed');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('generates a unique event id for every prayer log', async () => {
    await useCase.execute({
      userId: 'user-123',
      date: '1445-09-01',
      prayerName: 'fajr',
      type: 'obligatory',
    });

    const savedLog = vi.mocked(repository.save).mock.calls[0]![0] as PrayerLog;
    expect(savedLog.eventId.toString()).toBe('mock-ulid');
    expect(idGenerator.generate).toHaveBeenCalled();
  });
});
