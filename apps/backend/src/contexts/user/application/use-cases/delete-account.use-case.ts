import { IUserRepository } from '../../../shared/domain/repositories/user.repository';
import type { ICognitoAdminService } from '../../domain/services/cognito-admin.service.interface';
import { createLogger } from '../../../../shared/middleware/logger';
import { MESSAGES } from '../../../../shared/constants/messages';

const logger = createLogger('DeleteAccountUseCase');

export interface DeleteAccountCommand {
  userId: string;
}

export interface DeleteAccountResult {
  message: string;
  authDeleted: boolean;
}

export class DeleteAccountUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cognitoAdminService: ICognitoAdminService,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<DeleteAccountResult> {
    // Step 1: Delete all DynamoDB data. This is the priority — GDPR obligation is satisfied
    // once the personal data is gone. Throws on failure so the deletion is not claimed to
    // have succeeded when data still exists.
    await this.userRepository.deleteAccount(command.userId);

    // Step 2: Remove the Cognito account so the user cannot log in again.
    // If this step fails (e.g. account already deleted, Cognito unavailable in local dev),
    // the error is logged for manual cleanup but the DynamoDB deletion stands.
    try {
      await this.cognitoAdminService.deleteUser(command.userId);
      return {
        message: MESSAGES.USER.ACCOUNT_DELETED,
        authDeleted: true,
      };
    } catch (err) {
      logger.error(
        { err },
        'DynamoDB deletion succeeded but Cognito user removal failed — manual cleanup required',
      );
      return {
        message:
          'Account data was deleted, but identity cleanup could not be completed automatically.',
        authDeleted: false,
      };
    }
  }
}
