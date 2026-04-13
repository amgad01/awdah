import {
  prayerLogRepo,
  periodRepo,
  userRepo,
  salahCalculator,
  calendarService,
  userLifecycleJobRepo,
  idGenerator,
} from './repositories';
import { LogPrayerUseCase } from '../../contexts/salah/application/use-cases/log-prayer.use-case';
import { GetSalahDebtUseCase } from '../../contexts/salah/application/use-cases/get-salah-debt.use-case';
import { AddPracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/add-practicing-period.use-case';
import { GetPrayerHistoryUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history.use-case';
import { GetPrayerHistoryPageUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history-page.use-case';
import { DeletePrayerLogUseCase } from '../../contexts/salah/application/use-cases/delete-prayer-log.use-case';
import { DeletePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/delete-practicing-period.use-case';
import { UpdatePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/update-practicing-period.use-case';
import { GetPracticingPeriodsUseCase } from '../../contexts/salah/application/use-cases/get-practicing-periods.use-case';
import { ResetPrayerLogsUseCase } from '../../contexts/salah/application/use-cases/reset-prayer-logs.use-case';
import { userLifecycleJobDispatcher } from './user-use-cases';

export const logPrayerUseCase = new LogPrayerUseCase(prayerLogRepo, idGenerator);
export const getSalahDebtUseCase = new GetSalahDebtUseCase(
  userRepo,
  prayerLogRepo,
  periodRepo,
  salahCalculator,
  calendarService,
);
export const addPracticingPeriodUseCase = new AddPracticingPeriodUseCase(
  periodRepo,
  userRepo,
  idGenerator,
);
export const updatePracticingPeriodUseCase = new UpdatePracticingPeriodUseCase(
  periodRepo,
  userRepo,
);
export const getPracticingPeriodsUseCase = new GetPracticingPeriodsUseCase(periodRepo);
export const deletePracticingPeriodUseCase = new DeletePracticingPeriodUseCase(periodRepo);
export const getPrayerHistoryUseCase = new GetPrayerHistoryUseCase(prayerLogRepo);
export const getPrayerHistoryPageUseCase = new GetPrayerHistoryPageUseCase(prayerLogRepo);
export const deletePrayerLogUseCase = new DeletePrayerLogUseCase(prayerLogRepo, idGenerator);
export const resetPrayerLogsUseCase = new ResetPrayerLogsUseCase(
  userLifecycleJobRepo,
  userLifecycleJobDispatcher,
  idGenerator,
);
