import {
  getFastLogRepo,
  getPeriodRepo,
  getUserRepo,
  getUserLifecycleJobRepo,
  getSawmCalculator,
  getCalendarService,
  getIdGenerator,
} from './repositories';
import { LogFastUseCase } from '../../contexts/sawm/application/use-cases/log-fast.use-case';
import { GetSawmDebtUseCase } from '../../contexts/sawm/application/use-cases/get-sawm-debt.use-case';
import { GetFastHistoryUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history.use-case';
import { GetFastHistoryPageUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history-page.use-case';
import { DeleteFastLogUseCase } from '../../contexts/sawm/application/use-cases/delete-fast-log.use-case';
import { ResetFastLogsUseCase } from '../../contexts/sawm/application/use-cases/reset-fast-logs.use-case';
import { getUserLifecycleJobDispatcher } from './user-use-cases';

let logFastUseCase: LogFastUseCase | undefined;
export const getLogFastUseCase = (): LogFastUseCase => {
  if (!logFastUseCase) {
    logFastUseCase = new LogFastUseCase(getFastLogRepo(), getIdGenerator());
  }
  return logFastUseCase;
};

let sawmDebtUseCase: GetSawmDebtUseCase | undefined;
export const getSawmDebtUseCase = (): GetSawmDebtUseCase => {
  if (!sawmDebtUseCase) {
    sawmDebtUseCase = new GetSawmDebtUseCase(
      getUserRepo(),
      getFastLogRepo(),
      getPeriodRepo(),
      getSawmCalculator(),
      getCalendarService(),
    );
  }
  return sawmDebtUseCase;
};

let fastHistoryUseCase: GetFastHistoryUseCase | undefined;
export const getFastHistoryUseCase = (): GetFastHistoryUseCase => {
  if (!fastHistoryUseCase) {
    fastHistoryUseCase = new GetFastHistoryUseCase(getFastLogRepo());
  }
  return fastHistoryUseCase;
};

let fastHistoryPageUseCase: GetFastHistoryPageUseCase | undefined;
export const getFastHistoryPageUseCase = (): GetFastHistoryPageUseCase => {
  if (!fastHistoryPageUseCase) {
    fastHistoryPageUseCase = new GetFastHistoryPageUseCase(getFastLogRepo());
  }
  return fastHistoryPageUseCase;
};

let deleteFastLogUseCase: DeleteFastLogUseCase | undefined;
export const getDeleteFastLogUseCase = (): DeleteFastLogUseCase => {
  if (!deleteFastLogUseCase) {
    deleteFastLogUseCase = new DeleteFastLogUseCase(getFastLogRepo());
  }
  return deleteFastLogUseCase;
};

let resetFastLogsUseCase: ResetFastLogsUseCase | undefined;
export const getResetFastLogsUseCase = (): ResetFastLogsUseCase => {
  if (!resetFastLogsUseCase) {
    resetFastLogsUseCase = new ResetFastLogsUseCase(
      getUserLifecycleJobRepo(),
      getUserLifecycleJobDispatcher(),
      getIdGenerator(),
      getFastLogRepo(),
    );
  }
  return resetFastLogsUseCase;
};
