import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { ICognitoAdminService } from '../../../contexts/user/domain/services/cognito-admin.service.interface';
import { settings } from '../../config/settings';

export class CognitoAdminService implements ICognitoAdminService {
  private readonly client: CognitoIdentityProviderClient;

  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: settings.region,
      // In local development, point to LocalStack instead of real Cognito
      ...(process.env.LOCALSTACK_ENDPOINT ? { endpoint: process.env.LOCALSTACK_ENDPOINT } : {}),
    });
  }

  /**
   * Deletes a Cognito user account permanently.
   *
   * AdminDeleteUser accepts the `sub` UUID as the Username parameter — Cognito
   * resolves it regardless of the pool's alias configuration.
   */
  async deleteUser(userId: string): Promise<void> {
    await this.client.send(
      new AdminDeleteUserCommand({
        UserPoolId: settings.cognitoUserPoolId,
        Username: userId,
      }),
    );
  }
}
