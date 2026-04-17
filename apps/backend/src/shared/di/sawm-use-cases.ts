import {
  fastLogRepo,
  periodRepo,
  userRepo,
  userLifecycleJobRepo,
  sawmCalculator,
  calendarService,
  idGenerator,
} from './repositories';
import { LogFastUseCase } from '../../contexts/sawm/application/use-cases/log-fast.use-case';
import { GetSawmDebtUseCase } from '../../contexts/sawm/application/use-cases/get-sawm-debt.use-case';
import { GetFastHistoryUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history.use-case';
import { GetFastHistoryPageUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history-page.use-case';
import { DeleteFastLogUseCase } from '../../contexts/sawm/application/use-cases/delete-fast-log.use-case';
import { ResetFastLogsUseCase } from '../../contexts/sawm/application/use-cases/reset-fast-logs.use-case';
import { userLifecycleJobDispatcher } from './user-use-cases';

export const logFastUseCase = new LogFastUseCase(fastLogRepo, idGenerator);
export const getSawmDebtUseCase = new GetSawmDebtUseCase(
  userRepo,
  fastLogRepo,
  periodRepo,
  sawmCalculator,
  calendarService,
);
export const getFastHistoryUseCase = new GetFastHistoryUseCase(fastLogRepo);
export const getFastHistoryPageUseCase = new GetFastHistoryPageUseCase(fastLogRepo);
export const deleteFastLogUseCase = new DeleteFastLogUseCase(fastLogRepo);
export const resetFastLogsUseCase = new ResetFastLogsUseCase(
  userLifecycleJobRepo,
  userLifecycleJobDispatcher,
  idGenerator,
  fastLogRepo,
);
