import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  IUserRepository,
  UserSettings,
} from '../../../contexts/shared/domain/repositories/user.repository';
import {
  HijriDate,
  type Gender,
  type Madhab,
  type CalculationMethod,
  type MoonSightingPreference,
  type Location,
} from '@awdah/shared';
import { settings } from '../../config/settings';
import { UserSettingsSK } from './keys/user-settings-key';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';

// Single source of truth for all user-owned tables.
// Used by both deleteAccount() and exportData() to stay in sync.
const USER_MANAGED_TABLES = [
  { key: 'settings', tableName: settings.tables.userSettings, pkName: 'userId', skName: 'sk' },
  { key: 'prayerLogs', tableName: settings.tables.prayerLogs, pkName: 'userId', skName: 'sk' },
  { key: 'fastLogs', tableName: settings.tables.fastLogs, pkName: 'userId', skName: 'sk' },
  {
    key: 'practicingPeriods',
    tableName: settings.tables.practicingPeriods,
    pkName: 'userId',
    skName: 'periodId',
  },
] as const;

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

  async deleteAccount(userId: string): Promise<void> {
    for (const { tableName, pkName, skName } of USER_MANAGED_TABLES) {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const queryResult = await this.docClient.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: '#pk = :pk',
            ExpressionAttributeNames: { '#pk': pkName },
            ExpressionAttributeValues: { ':pk': userId },
            ProjectionExpression: `${pkName}, ${skName}`,
            ExclusiveStartKey: lastKey,
          }),
        );
        const keys = (queryResult.Items ?? []) as Record<string, unknown>[];
        lastKey = queryResult.LastEvaluatedKey as Record<string, unknown> | undefined;

        await this.deleteKeysInBatches(
          tableName,
          keys.map((key) => ({
            [pkName]: key[pkName],
            [skName]: key[skName],
          })),
        );
      } while (lastKey);
    }
  }

  async exportData(userId: string): Promise<Record<string, unknown>> {
    // Internal DynamoDB keys that should not appear in exported data
    const internalKeys = new Set(['userId', 'sk', 'typeDate']);

    const result: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      userId,
    };

    for (const { key, tableName, pkName, skName } of USER_MANAGED_TABLES) {
      const items: Record<string, unknown>[] = [];
      let lastKey: Record<string, unknown> | undefined;

      do {
        const queryResult = await this.docClient.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: '#pk = :pk',
            ExpressionAttributeNames: { '#pk': pkName },
            ExpressionAttributeValues: { ':pk': userId },
            ExclusiveStartKey: lastKey,
          }),
        );
        if (queryResult.Items) {
          for (const item of queryResult.Items) {
            const cleaned: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(item)) {
              if (!internalKeys.has(k)) {
                cleaned[k] = v;
              }
            }
            // Keep skName if it's meaningful (e.g. periodId)
            if (skName !== 'sk' && item[skName] !== undefined) {
              cleaned[skName] = item[skName];
            }
            items.push(cleaned);
          }
        }
        lastKey = queryResult.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastKey);

      result[key] = items;
    }

    return result;
  }

  protected encodeKeys(userSettings: UserSettings): DomainKeys {
    return {
      pk: userSettings.userId,
      sk: UserSettingsSK.SETTINGS,
    };
  }

  protected mapToPersistence(userSettings: UserSettings): Record<string, unknown> {
    return {
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
      userId: item.userId as string,
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
