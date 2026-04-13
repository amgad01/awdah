import {
  userRepo,
  userDataLifecycleService,
  userLifecycleJobRepo,
  deletedUsersRepo,
  idGenerator,
} from './repositories';
import { GetUserSettingsUseCase } from '../../contexts/user/application/use-cases/get-user-settings.use-case';
import { UpdateUserSettingsUseCase } from '../../contexts/user/application/use-cases/update-user-settings.use-case';
import { DeleteAccountUseCase } from '../../contexts/user/application/use-cases/delete-account.use-case';
import { ExportDataUseCase } from '../../contexts/user/application/use-cases/export-data.use-case';
import { GetUserLifecycleJobStatusUseCase } from '../../contexts/user/application/use-cases/get-user-lifecycle-job-status.use-case';
import { DownloadExportDataUseCase } from '../../contexts/user/application/use-cases/download-export-data.use-case';
import { FinalizeDeleteAccountUseCase } from '../../contexts/user/application/use-cases/finalize-delete-account.use-case';
import { ProcessUserLifecycleJobUseCase } from '../../contexts/user/application/use-cases/process-user-lifecycle-job.use-case';
import {
  InProcessUserLifecycleJobDispatcher,
  NoopUserLifecycleJobDispatcher,
} from '../infrastructure/local/in-process-user-lifecycle-job-dispatcher.service';
import { CognitoAdminService } from '../infrastructure/cognito/cognito-admin.service';

const cognitoAdminService = new CognitoAdminService();

export const getUserSettingsUseCase = new GetUserSettingsUseCase(userRepo);
export const updateUserSettingsUseCase = new UpdateUserSettingsUseCase(userRepo);
export const processUserLifecycleJobUseCase = new ProcessUserLifecycleJobUseCase(
  userLifecycleJobRepo,
  userDataLifecycleService,
  deletedUsersRepo,
);
export const userLifecycleJobDispatcher =
  process.env.LOCALSTACK_ENDPOINT && !process.env.AWS_LAMBDA_FUNCTION_NAME
    ? new InProcessUserLifecycleJobDispatcher(processUserLifecycleJobUseCase)
    : new NoopUserLifecycleJobDispatcher();
export const deleteAccountUseCase = new DeleteAccountUseCase(
  userLifecycleJobRepo,
  userLifecycleJobDispatcher,
  idGenerator,
);
export const finalizeDeleteAccountUseCase = new FinalizeDeleteAccountUseCase(
  userLifecycleJobRepo,
  cognitoAdminService,
);
export const exportDataUseCase = new ExportDataUseCase(
  userLifecycleJobRepo,
  userLifecycleJobDispatcher,
  idGenerator,
);
export const getUserLifecycleJobStatusUseCase = new GetUserLifecycleJobStatusUseCase(
  userLifecycleJobRepo,
);
export const downloadExportDataUseCase = new DownloadExportDataUseCase(userLifecycleJobRepo);
