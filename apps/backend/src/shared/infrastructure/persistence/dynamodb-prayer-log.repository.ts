import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IPrayerLogRepository } from '../../../contexts/salah/domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../contexts/salah/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository } from './base-dynamodb.repository';

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
        sk: `${log.date.toString()}#${log.prayerName.getValue().toUpperCase()}`,
        type: log.type.getValue(),
        loggedAt: log.loggedAt.toISOString(),
        typeDate: `${log.type.getValue()}#${log.date.toString()}`,
      },
    });

    await this.docClient.send(command);
  }

  async findByUserAndDate(userId: string, date: HijriDate): Promise<PrayerLog[]> {
    const items = await this.queryByPartitionKey(userId, { skPrefix: date.toString() });
    return items.map((item) => this.mapToDomain(item));
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<PrayerLog[]> {
    const items = await this.queryByPartitionKey(userId, {
      skBetween: {
        start: `${start.toString()}#`,
        end: `${end.toString()}#\uffff`,
      },
    });
    return items.map((item) => this.mapToDomain(item));
  }

  async countQadaaCompleted(userId: string): Promise<number> {
    return this.countByGSI(userId, 'GSI1', 'qadaa#');
  }

  protected mapToDomain(item: Record<string, unknown>): PrayerLog {
    const sk = (item.sk as string) || '';
    const [dateStr, prayerStr] = sk.split('#');

    if (!dateStr || !prayerStr) {
      throw new Error(`Malformed prayer log SK: ${sk}`);
    }

    return new PrayerLog({
      userId: (item.userId as string) || 'unknown',
      date: HijriDate.fromString(dateStr),
      prayerName: new PrayerName(prayerStr.toLowerCase()),
      type: new LogType((item.type as string) || 'unknown'),
      loggedAt: new Date((item.loggedAt as string) || new Date().toISOString()),
    });
  }
}
