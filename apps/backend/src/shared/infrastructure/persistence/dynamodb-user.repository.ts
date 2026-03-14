import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  IUserRepository,
  UserSettings,
} from '../../../contexts/shared/domain/repositories/user.repository';
import { HijriDate } from '@awdah/shared';
import { settings } from '../../config/settings';
import { UserSettingsSK } from './keys/user-settings-key';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';

export class DynamoDBUserRepository
  extends BaseDynamoDBRepository<UserSettings>
  implements IUserRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.userSettings, 'sk', 'userId');
  }

  async findById(userId: string): Promise<UserSettings | null> {
    return this.retrieve({ pk: userId, sk: UserSettingsSK.SETTINGS });
  }

  async save(userSettings: UserSettings): Promise<void> {
    await this.persist(userSettings);
  }

  protected encodeKeys(userSettings: UserSettings): DomainKeys {
    return {
      pk: userSettings.userId,
      sk: UserSettingsSK.SETTINGS,
    };
  }

  protected mapToPersistence(userSettings: UserSettings): Record<string, unknown> {
    return {
      bulughDate: userSettings.bulughDate.toString(),
      gender: userSettings.gender,
      updatedAt: new Date().toISOString(),
    };
  }

  protected mapToDomain(item: Record<string, unknown>): UserSettings {
    return {
      userId: item.userId as string,
      bulughDate: HijriDate.fromString(item.bulughDate as string),
      gender: item.gender as 'male' | 'female',
    };
  }
}
