import {
  getUserRepo,
  getUserDataLifecycleService,
  getUserLifecycleJobRepo,
  getDeletedUsersRepo,
  getIdGenerator,
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

let userSettingsUseCase: GetUserSettingsUseCase | undefined;
export const getUserSettingsUseCase = (): GetUserSettingsUseCase => {
  if (!userSettingsUseCase) {
    userSettingsUseCase = new GetUserSettingsUseCase(getUserRepo());
  }
  return userSettingsUseCase;
};

let updateUserSettingsUseCase: UpdateUserSettingsUseCase | undefined;
export const getUpdateUserSettingsUseCase = (): UpdateUserSettingsUseCase => {
  if (!updateUserSettingsUseCase) {
    updateUserSettingsUseCase = new UpdateUserSettingsUseCase(getUserRepo());
  }
  return updateUserSettingsUseCase;
};

let processUserLifecycleJobUseCase: ProcessUserLifecycleJobUseCase | undefined;
export const getProcessUserLifecycleJobUseCase = (): ProcessUserLifecycleJobUseCase => {
  if (!processUserLifecycleJobUseCase) {
    processUserLifecycleJobUseCase = new ProcessUserLifecycleJobUseCase(
      getUserLifecycleJobRepo(),
      getUserDataLifecycleService(),
      getDeletedUsersRepo(),
    );
  }
  return processUserLifecycleJobUseCase;
};

let userLifecycleJobDispatcherInstance:
  | InProcessUserLifecycleJobDispatcher
  | NoopUserLifecycleJobDispatcher
  | undefined;

export const getUserLifecycleJobDispatcher = ():
  | InProcessUserLifecycleJobDispatcher
  | NoopUserLifecycleJobDispatcher => {
  if (!userLifecycleJobDispatcherInstance) {
    userLifecycleJobDispatcherInstance =
      process.env.LOCALSTACK_ENDPOINT && !process.env.AWS_LAMBDA_FUNCTION_NAME
        ? new InProcessUserLifecycleJobDispatcher(getProcessUserLifecycleJobUseCase())
        : new NoopUserLifecycleJobDispatcher();
  }
  return userLifecycleJobDispatcherInstance;
};

let deleteAccountUseCase: DeleteAccountUseCase | undefined;
export const getDeleteAccountUseCase = (): DeleteAccountUseCase => {
  if (!deleteAccountUseCase) {
    deleteAccountUseCase = new DeleteAccountUseCase(
      getUserLifecycleJobRepo(),
      getUserLifecycleJobDispatcher(),
      getIdGenerator(),
    );
  }
  return deleteAccountUseCase;
};

let finalizeDeleteAccountUseCase: FinalizeDeleteAccountUseCase | undefined;
export const getFinalizeDeleteAccountUseCase = (): FinalizeDeleteAccountUseCase => {
  if (!finalizeDeleteAccountUseCase) {
    finalizeDeleteAccountUseCase = new FinalizeDeleteAccountUseCase(
      getUserLifecycleJobRepo(),
      cognitoAdminService,
    );
  }
  return finalizeDeleteAccountUseCase;
};

let exportDataUseCase: ExportDataUseCase | undefined;
export const getExportDataUseCase = (): ExportDataUseCase => {
  if (!exportDataUseCase) {
    exportDataUseCase = new ExportDataUseCase(
      getUserLifecycleJobRepo(),
      getUserLifecycleJobDispatcher(),
      getIdGenerator(),
    );
  }
  return exportDataUseCase;
};

let userLifecycleJobStatusUseCase: GetUserLifecycleJobStatusUseCase | undefined;
export const getUserLifecycleJobStatusUseCase = (): GetUserLifecycleJobStatusUseCase => {
  if (!userLifecycleJobStatusUseCase) {
    userLifecycleJobStatusUseCase = new GetUserLifecycleJobStatusUseCase(getUserLifecycleJobRepo());
  }
  return userLifecycleJobStatusUseCase;
};

let downloadExportDataUseCase: DownloadExportDataUseCase | undefined;
export const getDownloadExportDataUseCase = (): DownloadExportDataUseCase => {
  if (!downloadExportDataUseCase) {
    downloadExportDataUseCase = new DownloadExportDataUseCase(getUserLifecycleJobRepo());
  }
  return downloadExportDataUseCase;
};
