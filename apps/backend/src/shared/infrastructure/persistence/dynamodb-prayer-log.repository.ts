import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IPrayerLogRepository } from '../../../contexts/salah/domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository } from './base-dynamodb.repository';
import { PrayerLogKey } from './keys/prayer-log-key';

export class DynamoDBPrayerLogRepository
  extends BaseDynamoDBRepository<PrayerLog>
  implements IPrayerLogRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.prayerLogs);
  }

  async save(log: PrayerLog): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        userId: log.userId,
        sk: PrayerLogKey.encodeSk(log.date.toString(), log.prayerName.getValue(), log.eventId),
        type: log.type.getValue(),
        loggedAt: log.loggedAt.toISOString(),
        typeDate: PrayerLogKey.encodeTypeDate(log.type.getValue(), log.date.toString()),
      },
    });

    await this.docClient.send(command);
  }

  async findByUserAndDate(userId: string, date: HijriDate): Promise<PrayerLog[]> {
    const items = await this.queryByPartitionKey(userId, {
      skPrefix: PrayerLogKey.skPrefixForDate(date.toString()),
    });
    return items.map((item) => this.mapToDomain(item));
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<PrayerLog[]> {
    const items = await this.queryByPartitionKey(userId, {
      skBetween: {
        start: PrayerLogKey.skPrefixForDate(start.toString()),
        end: PrayerLogKey.skRangeEndForDate(end.toString()),
      },
    });
    return items.map((item) => this.mapToDomain(item));
  }

  async countQadaaCompleted(userId: string): Promise<number> {
    return this.countByGSI(userId, 'GSI1', PrayerLogKey.typeDatePrefixForType('qadaa'));
  }

  protected mapToDomain(item: Record<string, unknown>): PrayerLog {
    const sk = (item.sk as string) || '';
    const { date: dateStr, prayer: prayerStr, eventId } = PrayerLogKey.decodeSk(sk);

    return new PrayerLog({
      userId: (item.userId as string) || 'unknown',
      eventId,
      date: HijriDate.fromString(dateStr),
      prayerName: new PrayerName(prayerStr.toLowerCase()),
      type: new LogType((item.type as string) || 'unknown'),
      loggedAt: new Date((item.loggedAt as string) || new Date().toISOString()),
    });
  }

  async deleteEntry(
    userId: string,
    date: HijriDate,
    prayerName: string,
    eventId: string,
  ): Promise<void> {
    const sk = PrayerLogKey.encodeSk(date.toString(), prayerName, eventId);
    await this.deleteItem(userId, sk);
  }
}
