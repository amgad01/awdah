import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { ICognitoAdminService } from '../../../contexts/user/domain/services/cognito-admin.service.interface';
import { settings } from '../../config/settings';
import { createAwsClientConfig } from '../aws/client-config';

export class CognitoAdminService implements ICognitoAdminService {
  private readonly client: CognitoIdentityProviderClient;

  constructor(
    client = new CognitoIdentityProviderClient(createAwsClientConfig({ region: settings.region })),
  ) {
    this.client = client;
  }

  /**
   * Deletes a Cognito user account permanently.
   *
   * AdminDeleteUser accepts the `sub` UUID as the Username parameter — Cognito
   * resolves it regardless of the pool's alias configuration.
   */
  async deleteUser(userId: string): Promise<void> {
    if (
      process.env.LOCALSTACK_ENDPOINT &&
      (settings.cognitoUserPoolId.endsWith('_localdev') || userId.startsWith('local-'))
    ) {
      return;
    }

    try {
      await this.client.send(
        new AdminDeleteUserCommand({
          UserPoolId: settings.cognitoUserPoolId,
          Username: userId,
        }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'UserNotFoundException' || error.name === 'ResourceNotFoundException')
      ) {
        return;
      }

      throw error;
    }
  }
}
