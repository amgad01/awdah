import {
  prayerLogRepo,
  fastLogRepo,
  periodRepo,
  userRepo,
  salahCalculator,
  sawmCalculator,
  calendarService,
} from './repositories';

import { LogPrayerUseCase } from '../../contexts/salah/application/use-cases/log-prayer.use-case';
import { GetSalahDebtUseCase } from '../../contexts/salah/application/use-cases/get-salah-debt.use-case';
import { LogFastUseCase } from '../../contexts/sawm/application/use-cases/log-fast.use-case';
import { GetSawmDebtUseCase } from '../../contexts/sawm/application/use-cases/get-sawm-debt.use-case';
import { AddPracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/add-practicing-period.use-case';
import { GetPrayerHistoryUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history.use-case';
import { GetUserSettingsUseCase } from '../../contexts/user/application/use-cases/get-user-settings.use-case';
import { UpdateUserSettingsUseCase } from '../../contexts/user/application/use-cases/update-user-settings.use-case';
import { GetFastHistoryUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history.use-case';
import { DeletePrayerLogUseCase } from '../../contexts/salah/application/use-cases/delete-prayer-log.use-case';
import { DeleteFastLogUseCase } from '../../contexts/sawm/application/use-cases/delete-fast-log.use-case';
import { DeletePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/delete-practicing-period.use-case';
import { GetPracticingPeriodsUseCase } from '../../contexts/salah/application/use-cases/get-practicing-periods.use-case';

// Salah Use Cases
export const logPrayerUseCase = new LogPrayerUseCase(prayerLogRepo);
export const getSalahDebtUseCase = new GetSalahDebtUseCase(
  userRepo,
  prayerLogRepo,
  periodRepo,
  salahCalculator,
  calendarService,
);
export const addPracticingPeriodUseCase = new AddPracticingPeriodUseCase(periodRepo, userRepo);
export const getPracticingPeriodsUseCase = new GetPracticingPeriodsUseCase(periodRepo);
export const deletePracticingPeriodUseCase = new DeletePracticingPeriodUseCase(periodRepo);
export const getPrayerHistoryUseCase = new GetPrayerHistoryUseCase(prayerLogRepo);
export const deletePrayerLogUseCase = new DeletePrayerLogUseCase(prayerLogRepo);

// Sawm Use Cases
export const logFastUseCase = new LogFastUseCase(fastLogRepo);
export const getSawmDebtUseCase = new GetSawmDebtUseCase(
  userRepo,
  fastLogRepo,
  periodRepo,
  sawmCalculator,
  calendarService,
);
export const getFastHistoryUseCase = new GetFastHistoryUseCase(fastLogRepo);
export const deleteFastLogUseCase = new DeleteFastLogUseCase(fastLogRepo);

// User Use Cases
export const getUserSettingsUseCase = new GetUserSettingsUseCase(userRepo);
export const updateUserSettingsUseCase = new UpdateUserSettingsUseCase(userRepo);
