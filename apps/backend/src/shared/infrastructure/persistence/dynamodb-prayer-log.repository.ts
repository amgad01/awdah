import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IPrayerLogRepository } from '../../../contexts/salah/domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { PrayerLogKey } from './keys/prayer-log-key';

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
    const { items } = await this.findWithPrefix({
      pk: userId,
      skPrefix: PrayerLogKey.skPrefixForDate(date.toString()),
    });
    return items;
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<PrayerLog[]> {
    const { items } = await this.findInRange({
      pk: userId,
      range: {
        start: PrayerLogKey.skPrefixForDate(start.toString()),
        end: PrayerLogKey.skRangeEndForDate(end.toString()),
      },
    });
    return items;
  }

  async countQadaaCompleted(userId: string): Promise<number> {
    return this.countByGSI({
      pk: userId,
      indexName: 'typeDateIndex',
      skName: 'typeDate',
      skPrefix: PrayerLogKey.typeDatePrefixForType('qadaa'),
    });
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
    });
  }
}
