import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  IUserRepository,
  UserSettings,
} from '../../../contexts/shared/domain/repositories/user.repository';
import {
  HijriDate,
  UserId,
  type Gender,
  type Madhab,
  type CalculationMethod,
  type MoonSightingPreference,
  type Location,
} from '@awdah/shared';
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

  async findById(userId: UserId): Promise<UserSettings | null> {
    return this.retrieve({ pk: userId.toString(), sk: UserSettingsSK.SETTINGS });
  }

  async save(userSettings: UserSettings): Promise<void> {
    await this.persist(userSettings);
  }

  protected encodeKeys(userSettings: UserSettings): DomainKeys {
    return {
      pk: userSettings.userId.toString(),
      sk: UserSettingsSK.SETTINGS,
    };
  }

  protected mapToPersistence(userSettings: UserSettings): Record<string, unknown> {
    return {
      username: userSettings.username,
      dateOfBirth: userSettings.dateOfBirth?.toString(),
      bulughDate: userSettings.bulughDate.toString(),
      revertDate: userSettings.revertDate?.toString(),
      gender: userSettings.gender,
      madhab: userSettings.madhab,
      calculationMethod: userSettings.calculationMethod,
      moonSightingPreference: userSettings.moonSightingPreference,
      location: userSettings.location,
      updatedAt: new Date().toISOString(),
    };
  }

  protected mapToDomain(item: Record<string, unknown>): UserSettings {
    return {
      userId: new UserId(item.userId as string),
      username: item.username as string | undefined,
      dateOfBirth: item.dateOfBirth ? HijriDate.fromString(item.dateOfBirth as string) : undefined,
      bulughDate: HijriDate.fromString(item.bulughDate as string),
      revertDate: item.revertDate ? HijriDate.fromString(item.revertDate as string) : undefined,
      gender: item.gender as Gender,
      madhab: item.madhab as Madhab | undefined,
      calculationMethod: item.calculationMethod as CalculationMethod | undefined,
      moonSightingPreference: item.moonSightingPreference as MoonSightingPreference | undefined,
      location: item.location as Location | undefined,
    };
  }
}
