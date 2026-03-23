import type { ICognitoAdminService } from '../../domain/services/cognito-admin.service.interface';
import type { IUserDataLifecycleService } from '../../domain/services/user-data-lifecycle.service.interface';
import { createLogger } from '../../../../shared/middleware/logger';

const logger = createLogger('DeleteAccountUseCase');

export interface DeleteAccountCommand {
  userId: string;
}

export interface DeleteAccountResult {
  authDeleted: boolean;
}

export class DeleteAccountUseCase {
  constructor(
    private readonly userDataLifecycleService: IUserDataLifecycleService,
    private readonly cognitoAdminService: ICognitoAdminService,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<DeleteAccountResult> {
    // Step 1: Delete all DynamoDB data. This is the priority — GDPR obligation is satisfied
    // once the personal data is gone. Throws on failure so the deletion is not claimed to
    // have succeeded when data still exists.
    await this.userDataLifecycleService.deleteUserData(command.userId);

    // Step 2: Remove the Cognito account so the user cannot log in again.
    // If this step fails (e.g. account already deleted, Cognito unavailable in local dev),
    // the error is logged for manual cleanup but the DynamoDB deletion stands.
    try {
      await this.cognitoAdminService.deleteUser(command.userId);
      return {
        authDeleted: true,
      };
    } catch (err) {
      logger.error(
        { err },
        'DynamoDB deletion succeeded but Cognito user removal failed — manual cleanup required',
      );
      return {
        authDeleted: false,
      };
    }
  }
}
