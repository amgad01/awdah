import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IFastLogRepository } from '../../../contexts/sawm/domain/repositories/fast-log.repository';
import { FastLog } from '../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate, type BreakReason } from '@awdah/shared';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { FastLogKey } from './keys/fast-log-key';

export class DynamoDBFastLogRepository
  extends BaseDynamoDBRepository<FastLog>
  implements IFastLogRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.fastLogs, 'sk', 'userId');
  }

  async save(log: FastLog): Promise<void> {
    await this.persist(log);
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<FastLog[]> {
    const { items } = await this.findInRange({
      pk: userId,
      range: {
        start: FastLogKey.skPrefixForDate(start.toString()),
        end: FastLogKey.skRangeEndForDate(end.toString()),
      },
    });
    return items;
  }

  async countQadaaCompleted(userId: string): Promise<number> {
    return this.countByGSI({
      pk: userId,
      indexName: 'GSI1',
      skName: 'typeDate',
      skPrefix: FastLogKey.typeDatePrefixForType('qadaa'),
    });
  }

  async deleteEntry(userId: string, date: HijriDate, eventId: string): Promise<void> {
    await this.deleteItem({ pk: userId, sk: FastLogKey.encodeSk(date.toString(), eventId) });
  }

  protected encodeKeys(log: FastLog): DomainKeys {
    return {
      pk: log.userId,
      sk: FastLogKey.encodeSk(log.date.toString(), log.eventId),
    };
  }

  protected mapToPersistence(log: FastLog): Record<string, unknown> {
    return {
      type: log.type.getValue(),
      loggedAt: log.loggedAt.toISOString(),
      typeDate: FastLogKey.encodeTypeDate(log.type.getValue(), log.date.toString()),
      breakReason: log.breakReason,
      isVoluntary: log.isVoluntary,
    };
  }

  protected mapToDomain(item: Record<string, unknown>): FastLog {
    const { date, eventId } = FastLogKey.decodeSk(item.sk as string);
    return new FastLog({
      userId: item.userId as string,
      date: HijriDate.fromString(date),
      eventId,
      type: new LogType(item.type as string),
      loggedAt: new Date(item.loggedAt as string),
      breakReason: item.breakReason as BreakReason | undefined,
      isVoluntary: item.isVoluntary as boolean,
    });
  }
}
