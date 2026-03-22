import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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
    const tablesToClear = [
      { tableName: settings.tables.userSettings, pkName: 'userId', skName: 'sk' },
      { tableName: settings.tables.prayerLogs, pkName: 'userId', skName: 'sk' },
      { tableName: settings.tables.fastLogs, pkName: 'userId', skName: 'sk' },
      {
        tableName: settings.tables.practicingPeriods,
        pkName: 'userId',
        skName: 'periodId',
      },
    ];

    for (const { tableName, pkName, skName } of tablesToClear) {
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

        // BatchWrite processes up to 25 items at a time
        for (let i = 0; i < keys.length; i += 25) {
          const batch = keys.slice(i, i + 25);
          await this.docClient.send(
            new BatchWriteCommand({
              RequestItems: {
                [tableName]: batch.map((key) => ({
                  DeleteRequest: { Key: { [pkName]: key[pkName], [skName]: key[skName] } },
                })),
              },
            }),
          );
        }
      } while (lastKey);
    }
  }

  async exportData(userId: string): Promise<Record<string, unknown>> {
    const tablesToExport = [
      { key: 'settings', tableName: settings.tables.userSettings, pkName: 'userId' },
      { key: 'prayerLogs', tableName: settings.tables.prayerLogs, pkName: 'userId' },
      { key: 'fastLogs', tableName: settings.tables.fastLogs, pkName: 'userId' },
      { key: 'practicingPeriods', tableName: settings.tables.practicingPeriods, pkName: 'userId' },
    ];

    const result: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      userId,
    };

    for (const { key, tableName, pkName } of tablesToExport) {
      const items: unknown[] = [];
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
          items.push(...queryResult.Items);
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
      gender: item.gender as Gender,
      madhab: item.madhab as Madhab | undefined,
      calculationMethod: item.calculationMethod as CalculationMethod | undefined,
      moonSightingPreference: item.moonSightingPreference as MoonSightingPreference | undefined,
      location: item.location as Location | undefined,
    };
  }
}
