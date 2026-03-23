import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository } from './base-dynamodb.repository';
import { PrayerLogKey } from './keys/prayer-log-key';
import { FastLogKey } from './keys/fast-log-key';
import type {
  IUserDataLifecycleService,
  UserDataExport,
} from '../../../contexts/user/domain/services/user-data-lifecycle.service.interface';

type UserManagedTableDescriptor = {
  key: 'settings' | 'prayerLogs' | 'fastLogs' | 'practicingPeriods';
  tableName: string;
  pkName: string;
  skName: string;
  exportProjectionExpression: string;
  exportExpressionAttributeNames?: Record<string, string>;
  mapExportItem: (item: Record<string, unknown>) => Record<string, unknown>;
};

const USER_MANAGED_TABLES: UserManagedTableDescriptor[] = [
  {
    key: 'settings',
    tableName: settings.tables.userSettings,
    pkName: 'userId',
    skName: 'sk',
    exportProjectionExpression:
      'dateOfBirth, bulughDate, revertDate, gender, madhab, calculationMethod, moonSightingPreference, #location, updatedAt',
    exportExpressionAttributeNames: {
      '#location': 'location',
    },
    mapExportItem: (item) =>
      omitUndefinedFields({
        dateOfBirth: item.dateOfBirth,
        bulughDate: item.bulughDate,
        revertDate: item.revertDate,
        gender: item.gender,
        madhab: item.madhab,
        calculationMethod: item.calculationMethod,
        moonSightingPreference: item.moonSightingPreference,
        location: item.location,
        updatedAt: item.updatedAt,
      }),
  },
  {
    key: 'prayerLogs',
    tableName: settings.tables.prayerLogs,
    pkName: 'userId',
    skName: 'sk',
    exportProjectionExpression: 'sk, #type, loggedAt, isVoluntary',
    exportExpressionAttributeNames: {
      '#type': 'type',
    },
    mapExportItem: (item) => {
      const { date, prayer, eventId } = PrayerLogKey.decodeSk(item.sk as string);
      return omitUndefinedFields({
        eventId,
        date,
        prayerName: prayer.toLowerCase(),
        type: item.type,
        loggedAt: item.loggedAt,
        isVoluntary: item.isVoluntary,
      });
    },
  },
  {
    key: 'fastLogs',
    tableName: settings.tables.fastLogs,
    pkName: 'userId',
    skName: 'sk',
    exportProjectionExpression: 'sk, #type, loggedAt, breakReason, isVoluntary',
    exportExpressionAttributeNames: {
      '#type': 'type',
    },
    mapExportItem: (item) => {
      const { date, eventId } = FastLogKey.decodeSk(item.sk as string);
      return omitUndefinedFields({
        eventId,
        date,
        type: item.type,
        loggedAt: item.loggedAt,
        breakReason: item.breakReason,
        isVoluntary: item.isVoluntary,
      });
    },
  },
  {
    key: 'practicingPeriods',
    tableName: settings.tables.practicingPeriods,
    pkName: 'userId',
    skName: 'periodId',
    exportProjectionExpression: 'periodId, startDate, endDate, #type',
    exportExpressionAttributeNames: {
      '#type': 'type',
    },
    mapExportItem: (item) =>
      omitUndefinedFields({
        periodId: item.periodId,
        startDate: item.startDate,
        endDate: item.endDate,
        type: item.type,
      }),
  },
] as const;

export class DynamoDBUserDataLifecycleService
  extends BaseDynamoDBRepository<Record<string, unknown>>
  implements IUserDataLifecycleService
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.userSettings, 'sk', 'userId');
  }

  async deleteUserData(userId: string): Promise<void> {
    for (const table of USER_MANAGED_TABLES) {
      await this.forEachManagedTablePage(
        table,
        userId,
        async (items) => {
          await this.deleteKeysInBatches(
            table.tableName,
            items.map((item) => ({
              [table.pkName]: item[table.pkName],
              [table.skName]: item[table.skName],
            })),
          );
        },
        `${table.pkName}, ${table.skName}`,
      );
    }
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    const result: UserDataExport = {
      exportedAt: new Date().toISOString(),
      userId,
    };

    for (const table of USER_MANAGED_TABLES) {
      const items: Record<string, unknown>[] = [];

      await this.forEachManagedTablePage(
        table,
        userId,
        async (pageItems) => {
          items.push(...pageItems.map((item) => table.mapExportItem(item)));
        },
        table.exportProjectionExpression,
        table.exportExpressionAttributeNames,
      );

      result[table.key] = items;
    }

    return result;
  }

  protected encodeKeys(): { pk: string; sk: string } {
    throw new Error('DynamoDBUserDataLifecycleService does not persist single domain records');
  }

  protected mapToPersistence(): Record<string, unknown> {
    throw new Error('DynamoDBUserDataLifecycleService does not persist single domain records');
  }

  protected mapToDomain(item: Record<string, unknown>): Record<string, unknown> {
    return item;
  }

  private async forEachManagedTablePage(
    table: UserManagedTableDescriptor,
    userId: string,
    onPage: (items: Record<string, unknown>[]) => Promise<void>,
    projectionExpression?: string,
    extraExpressionAttributeNames?: Record<string, string>,
  ): Promise<void> {
    let lastKey: Record<string, unknown> | undefined;

    do {
      const queryResult = await this.docClient.send(
        new QueryCommand({
          TableName: table.tableName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: {
            '#pk': table.pkName,
            ...extraExpressionAttributeNames,
          },
          ExpressionAttributeValues: { ':pk': userId },
          ProjectionExpression: projectionExpression,
          ExclusiveStartKey: lastKey,
        }),
      );

      await onPage((queryResult.Items ?? []) as Record<string, unknown>[]);
      lastKey = queryResult.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
  }
}

function omitUndefinedFields(item: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}
