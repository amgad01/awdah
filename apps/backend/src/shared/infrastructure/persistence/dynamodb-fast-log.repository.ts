import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IFastLogRepository } from '../../../contexts/sawm/domain/repositories/fast-log.repository';
import { FastLog } from '../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate } from '@awdah/shared';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository } from './base-dynamodb.repository';
import { FastLogKey } from './keys/fast-log-key';

export class DynamoDBFastLogRepository
  extends BaseDynamoDBRepository<FastLog>
  implements IFastLogRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.fastLogs);
  }

  async save(log: FastLog): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        userId: log.userId,
        sk: FastLogKey.encodeSk(log.date.toString(), log.eventId),
        type: log.type.getValue(),
        loggedAt: log.loggedAt.toISOString(),
        typeDate: FastLogKey.encodeTypeDate(log.type.getValue(), log.date.toString()),
      },
    });

    await this.docClient.send(command);
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<FastLog[]> {
    const items = await this.queryByPartitionKey(userId, {
      skBetween: {
        start: FastLogKey.skPrefixForDate(start.toString()),
        end: FastLogKey.skRangeEndForDate(end.toString()),
      },
    });
    return items.map((item) => this.mapToDomain(item));
  }

  async countQadaaCompleted(userId: string): Promise<number> {
    return this.countByGSI(userId, 'GSI1', FastLogKey.typeDatePrefixForType('qadaa'));
  }

  protected mapToDomain(item: Record<string, unknown>): FastLog {
    const sk = (item.sk as string) || '';
    const { date: dateStr, eventId } = FastLogKey.decodeSk(sk);
    return new FastLog({
      userId: (item.userId as string) || 'unknown',
      eventId,
      date: HijriDate.fromString(dateStr),
      type: new LogType((item.type as string) || 'unknown'),
      loggedAt: new Date((item.loggedAt as string) || new Date().toISOString()),
    });
  }

  async deleteEntry(userId: string, date: HijriDate, eventId: string): Promise<void> {
    const sk = FastLogKey.encodeSk(date.toString(), eventId);
    await this.deleteItem(userId, sk);
  }
}
