import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IFastLogRepository } from '../../../contexts/sawm/domain/repositories/fast-log.repository';
import { FastLog } from '../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate, type BreakReason } from '@awdah/shared';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { FastLogKey } from './keys/fast-log-key';
import { decodeCursor, encodeCursor } from './cursor';

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

  async findByUserAndDate(userId: string, date: HijriDate): Promise<FastLog[]> {
    return this.findAllWithPrefix({
      pk: userId,
      skPrefix: FastLogKey.skPrefixForDate(date.toString()),
    });
  }

  async findByUserAndDateRange(
    userId: string,
    start: HijriDate,
    end: HijriDate,
  ): Promise<FastLog[]> {
    return this.findAllInRange({
      pk: userId,
      range: {
        start: FastLogKey.skPrefixForDate(start.toString()),
        end: FastLogKey.skRangeEndForDate(end.toString()),
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
  ): Promise<{ items: FastLog[]; nextCursor?: string }> {
    const result = await this.findInRange({
      pk: userId,
      range: {
        start: FastLogKey.skPrefixForDate(start.toString()),
        end: FastLogKey.skRangeEndForDate(end.toString()),
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
      skPrefix: FastLogKey.typeDatePrefixForType('qadaa'),
    });
  }

  async deleteEntry(userId: string, date: HijriDate, eventId: string): Promise<void> {
    await this.deleteItem({ pk: userId, sk: FastLogKey.encodeSk(date.toString(), eventId) });
  }

  async clearAll(userId: string): Promise<void> {
    await this.deleteAll({ pk: userId });
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
