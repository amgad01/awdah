import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { IPrayerLogRepository } from '../../../contexts/salah/domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { PrayerLogKey } from './keys/prayer-log-key';
import { decodeCursor, encodeCursor } from './cursor';

export class DynamoDBPrayerLogRepository
  extends BaseDynamoDBRepository<PrayerLog>
  implements IPrayerLogRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.prayerLogs, 'sk', 'userId');
  }

  async save(log: PrayerLog): Promise<void> {
    await this.persist(log);
  }

  async findByUserAndDate(userId: string, date: HijriDate): Promise<PrayerLog[]> {
    return this.findAllWithPrefix({
      pk: userId,
      skPrefix: PrayerLogKey.skPrefixForDate(date.toString()),
    });
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<PrayerLog[]> {
    return this.findAllInRange({
      pk: userId,
      range: {
        start: PrayerLogKey.skPrefixForDate(start.toString()),
        end: PrayerLogKey.skRangeEndForDate(end.toString()),
      },
    });
  }

  async findPageByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
    options?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<{ items: PrayerLog[]; nextCursor?: string }> {
    const result = await this.findInRange({
      pk: userId,
      range: {
        start: PrayerLogKey.skPrefixForDate(start.toString()),
        end: PrayerLogKey.skRangeEndForDate(end.toString()),
      },
      limit: options?.limit,
      exclusiveStartKey: decodeCursor(options?.cursor),
      scanIndexForward: false,
    });

    return {
      items: result.items,
      nextCursor: encodeCursor(result.lastEvaluatedKey),
    };
  }

  async countQadaaCompleted(userId: string): Promise<number> {
    return this.countByGSI({
      pk: userId,
      indexName: 'typeDateIndex',
      skName: 'typeDate',
      skPrefix: PrayerLogKey.typeDatePrefixForType('qadaa'),
    });
  }

  async countQadaaCompletedByPrayer(userId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    let lastKey: Record<string, unknown> | undefined;

    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'typeDateIndex',
        KeyConditionExpression: `${this.pkName} = :pk AND begins_with(typeDate, :type)`,
        ExpressionAttributeValues: {
          ':pk': userId,
          ':type': PrayerLogKey.typeDatePrefixForType('qadaa'),
        },
        ProjectionExpression: 'sk',
        ExclusiveStartKey: lastKey,
      });

      const response = await this.docClient.send(command);
      for (const item of response.Items ?? []) {
        try {
          const { prayer } = PrayerLogKey.decodeSk(item.sk as string);
          const name = prayer.toLowerCase();
          counts[name] = (counts[name] ?? 0) + 1;
        } catch {
          // Skip items with malformed SK rather than crashing the Lambda
        }
      }
      lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return counts;
  }

  async deleteEntry(
    userId: string,
    date: HijriDate,
    prayerName: string,
    eventId: string,
  ): Promise<void> {
    await this.deleteItem({
      pk: userId,
      sk: PrayerLogKey.encodeSk(date.toString(), prayerName, eventId),
    });
  }

  async clearAll(userId: string): Promise<void> {
    await this.deleteAll({ pk: userId });
  }

  protected encodeKeys(log: PrayerLog): DomainKeys {
    return {
      pk: log.userId,
      sk: PrayerLogKey.encodeSk(log.date.toString(), log.prayerName.getValue(), log.eventId),
    };
  }

  protected mapToPersistence(log: PrayerLog): Record<string, unknown> {
    return {
      type: log.type.getValue(),
      loggedAt: log.loggedAt.toISOString(),
      typeDate: PrayerLogKey.encodeTypeDate(log.type.getValue(), log.date.toString()),
      isVoluntary: log.isVoluntary,
    };
  }

  protected mapToDomain(item: Record<string, unknown>): PrayerLog {
    const { date, prayer, eventId } = PrayerLogKey.decodeSk(item.sk as string);
    return new PrayerLog({
      userId: item.userId as string,
      date: HijriDate.fromString(date),
      prayerName: new PrayerName(prayer.toLowerCase()),
      eventId,
      type: new LogType(item.type as string),
      loggedAt: new Date(item.loggedAt as string),
      isVoluntary: item.isVoluntary as boolean,
    });
  }
}
