import {
  prayerLogRepo,
  fastLogRepo,
  periodRepo,
  userRepo,
  userDataLifecycleService,
  userLifecycleJobRepo,
  salahCalculator,
  sawmCalculator,
  calendarService,
} from './repositories';
import { cognitoAdminService } from './services';
import { LogPrayerUseCase } from '../../contexts/salah/application/use-cases/log-prayer.use-case';
import { GetSalahDebtUseCase } from '../../contexts/salah/application/use-cases/get-salah-debt.use-case';
import { LogFastUseCase } from '../../contexts/sawm/application/use-cases/log-fast.use-case';
import { GetSawmDebtUseCase } from '../../contexts/sawm/application/use-cases/get-sawm-debt.use-case';
import { AddPracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/add-practicing-period.use-case';
import { GetPrayerHistoryUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history.use-case';
import { GetPrayerHistoryPageUseCase } from '../../contexts/salah/application/use-cases/get-prayer-history-page.use-case';
import { GetUserSettingsUseCase } from '../../contexts/user/application/use-cases/get-user-settings.use-case';
import { UpdateUserSettingsUseCase } from '../../contexts/user/application/use-cases/update-user-settings.use-case';
import { DeleteAccountUseCase } from '../../contexts/user/application/use-cases/delete-account.use-case';
import { ExportDataUseCase } from '../../contexts/user/application/use-cases/export-data.use-case';
import { GetUserLifecycleJobStatusUseCase } from '../../contexts/user/application/use-cases/get-user-lifecycle-job-status.use-case';
import { DownloadExportDataUseCase } from '../../contexts/user/application/use-cases/download-export-data.use-case';
import { FinalizeDeleteAccountUseCase } from '../../contexts/user/application/use-cases/finalize-delete-account.use-case';
import { ProcessUserLifecycleJobUseCase } from '../../contexts/user/application/use-cases/process-user-lifecycle-job.use-case';
import { GetFastHistoryUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history.use-case';
import { GetFastHistoryPageUseCase } from '../../contexts/sawm/application/use-cases/get-fast-history-page.use-case';
import { DeletePrayerLogUseCase } from '../../contexts/salah/application/use-cases/delete-prayer-log.use-case';
import { DeleteFastLogUseCase } from '../../contexts/sawm/application/use-cases/delete-fast-log.use-case';
import { DeletePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/delete-practicing-period.use-case';
import { UpdatePracticingPeriodUseCase } from '../../contexts/salah/application/use-cases/update-practicing-period.use-case';
import { GetPracticingPeriodsUseCase } from '../../contexts/salah/application/use-cases/get-practicing-periods.use-case';
import { ResetPrayerLogsUseCase } from '../../contexts/salah/application/use-cases/reset-prayer-logs.use-case';
import { ResetFastLogsUseCase } from '../../contexts/sawm/application/use-cases/reset-fast-logs.use-case';
import {
  InProcessUserLifecycleJobDispatcher,
  NoopUserLifecycleJobDispatcher,
} from '../infrastructure/services/in-process-user-lifecycle-job-dispatcher.service';

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
export const updatePracticingPeriodUseCase = new UpdatePracticingPeriodUseCase(
  periodRepo,
  userRepo,
);
export const getPracticingPeriodsUseCase = new GetPracticingPeriodsUseCase(periodRepo);
export const deletePracticingPeriodUseCase = new DeletePracticingPeriodUseCase(periodRepo);
export const getPrayerHistoryUseCase = new GetPrayerHistoryUseCase(prayerLogRepo);
export const getPrayerHistoryPageUseCase = new GetPrayerHistoryPageUseCase(prayerLogRepo);
export const deletePrayerLogUseCase = new DeletePrayerLogUseCase(prayerLogRepo);
export const resetPrayerLogsUseCase = new ResetPrayerLogsUseCase(prayerLogRepo);

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
export const getFastHistoryPageUseCase = new GetFastHistoryPageUseCase(fastLogRepo);
export const deleteFastLogUseCase = new DeleteFastLogUseCase(fastLogRepo);
export const resetFastLogsUseCase = new ResetFastLogsUseCase(fastLogRepo);

// User Use Cases
export const getUserSettingsUseCase = new GetUserSettingsUseCase(userRepo);
export const updateUserSettingsUseCase = new UpdateUserSettingsUseCase(userRepo);
export const processUserLifecycleJobUseCase = new ProcessUserLifecycleJobUseCase(
  userLifecycleJobRepo,
  userDataLifecycleService,
);
const userLifecycleJobDispatcher =
  process.env.LOCALSTACK_ENDPOINT && !process.env.AWS_LAMBDA_FUNCTION_NAME
    ? new InProcessUserLifecycleJobDispatcher(processUserLifecycleJobUseCase)
    : new NoopUserLifecycleJobDispatcher();
export const deleteAccountUseCase = new DeleteAccountUseCase(
  userLifecycleJobRepo,
  userLifecycleJobDispatcher,
);
export const finalizeDeleteAccountUseCase = new FinalizeDeleteAccountUseCase(
  userLifecycleJobRepo,
  cognitoAdminService,
);
export const exportDataUseCase = new ExportDataUseCase(
  userLifecycleJobRepo,
  userLifecycleJobDispatcher,
);
export const getUserLifecycleJobStatusUseCase = new GetUserLifecycleJobStatusUseCase(
  userLifecycleJobRepo,
);
export const downloadExportDataUseCase = new DownloadExportDataUseCase(userLifecycleJobRepo);
