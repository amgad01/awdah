import {
  getPrayerLogRepo,
  getPeriodRepo,
  getUserRepo,
  getUserLifecycleJobRepo,
  getSalahCalculator,
  getCalendarService,
  getIdGenerator,
} from './repositories';
import { LogPrayerUseCase } from '../../contexts/salah/application/use-cases/log-prayer.use-case';
import { GetSalahDebtUseCase } from '../../contexts/salah/application/use-cases/get-salah-debt.use-case';
import { GetPrayerHistoryUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history.use-case';
import { GetPrayerHistoryPageUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history-page.use-case';
import { DeletePrayerLogUseCase } from '../../contexts/salah/application/use-cases/delete-prayer-log.use-case';
import { AddPracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/add-practicing-period.use-case';
import { GetPracticingPeriodsUseCase } from '../../contexts/salah/application/use-cases/get-practicing-periods.use-case';
import { UpdatePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/update-practicing-period.use-case';
import { DeletePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/delete-practicing-period.use-case';
import { ResetPrayerLogsUseCase } from '../../contexts/salah/application/use-cases/reset-prayer-logs.use-case';
import { getUserLifecycleJobDispatcher } from './user-use-cases';

let logPrayerUseCase: LogPrayerUseCase | undefined;
export const getLogPrayerUseCase = (): LogPrayerUseCase => {
  if (!logPrayerUseCase) {
    logPrayerUseCase = new LogPrayerUseCase(getPrayerLogRepo(), getIdGenerator());
  }
  return logPrayerUseCase;
};

let salahDebtUseCase: GetSalahDebtUseCase | undefined;
export const getSalahDebtUseCase = (): GetSalahDebtUseCase => {
  if (!salahDebtUseCase) {
    salahDebtUseCase = new GetSalahDebtUseCase(
      getUserRepo(),
      getPrayerLogRepo(),
      getPeriodRepo(),
      getSalahCalculator(),
      getCalendarService(),
    );
  }
  return salahDebtUseCase;
};

let prayerHistoryUseCase: GetPrayerHistoryUseCase | undefined;
export const getPrayerHistoryUseCase = (): GetPrayerHistoryUseCase => {
  if (!prayerHistoryUseCase) {
    prayerHistoryUseCase = new GetPrayerHistoryUseCase(getPrayerLogRepo());
  }
  return prayerHistoryUseCase;
};

let prayerHistoryPageUseCase: GetPrayerHistoryPageUseCase | undefined;
export const getPrayerHistoryPageUseCase = (): GetPrayerHistoryPageUseCase => {
  if (!prayerHistoryPageUseCase) {
    prayerHistoryPageUseCase = new GetPrayerHistoryPageUseCase(getPrayerLogRepo());
  }
  return prayerHistoryPageUseCase;
};

let deletePrayerLogUseCase: DeletePrayerLogUseCase | undefined;
export const getDeletePrayerLogUseCase = (): DeletePrayerLogUseCase => {
  if (!deletePrayerLogUseCase) {
    deletePrayerLogUseCase = new DeletePrayerLogUseCase(getPrayerLogRepo(), getIdGenerator());
  }
  return deletePrayerLogUseCase;
};

let addPracticingPeriodUseCase: AddPracticingPeriodUseCase | undefined;
export const getAddPracticingPeriodUseCase = (): AddPracticingPeriodUseCase => {
  if (!addPracticingPeriodUseCase) {
    addPracticingPeriodUseCase = new AddPracticingPeriodUseCase(
      getPeriodRepo(),
      getUserRepo(),
      getIdGenerator(),
    );
  }
  return addPracticingPeriodUseCase;
};

let practicingPeriodsUseCase: GetPracticingPeriodsUseCase | undefined;
export const getPracticingPeriodsUseCase = (): GetPracticingPeriodsUseCase => {
  if (!practicingPeriodsUseCase) {
    practicingPeriodsUseCase = new GetPracticingPeriodsUseCase(getPeriodRepo());
  }
  return practicingPeriodsUseCase;
};

let updatePracticingPeriodUseCase: UpdatePracticingPeriodUseCase | undefined;
export const getUpdatePracticingPeriodUseCase = (): UpdatePracticingPeriodUseCase => {
  if (!updatePracticingPeriodUseCase) {
    updatePracticingPeriodUseCase = new UpdatePracticingPeriodUseCase(
      getPeriodRepo(),
      getUserRepo(),
    );
  }
  return updatePracticingPeriodUseCase;
};

let deletePracticingPeriodUseCase: DeletePracticingPeriodUseCase | undefined;
export const getDeletePracticingPeriodUseCase = (): DeletePracticingPeriodUseCase => {
  if (!deletePracticingPeriodUseCase) {
    deletePracticingPeriodUseCase = new DeletePracticingPeriodUseCase(getPeriodRepo());
  }
  return deletePracticingPeriodUseCase;
};

let resetPrayerLogsUseCase: ResetPrayerLogsUseCase | undefined;
export const getResetPrayerLogsUseCase = (): ResetPrayerLogsUseCase => {
  if (!resetPrayerLogsUseCase) {
    resetPrayerLogsUseCase = new ResetPrayerLogsUseCase(
      getUserLifecycleJobRepo(),
      getUserLifecycleJobDispatcher(),
      getIdGenerator(),
      getPrayerLogRepo(),
    );
  }
  return resetPrayerLogsUseCase;
};
