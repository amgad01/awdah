import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IFastLogRepository } from '../../../contexts/sawm/domain/repositories/fast-log.repository';
import { FastLog } from '../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { FastLogKey } from './keys/fast-log-key';
import { decodeCursor, encodeCursor } from './cursor';
import { FastLogMapper } from './mappers/fast-log.mapper';

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

  async findByUserAndDate(userId: UserId, date: HijriDate): Promise<FastLog[]> {
    return this.findAllWithPrefix({
      pk: userId.toString(),
      skPrefix: FastLogKey.skPrefixForDate(date.toString()),
    });
  }

  async findByUserAndDateRange(
    userId: UserId,
    start: HijriDate,
    end: HijriDate,
  ): Promise<FastLog[]> {
    return this.findAllInRange({
      pk: userId.toString(),
      range: {
        start: FastLogKey.skPrefixForDate(start.toString()),
        end: FastLogKey.skRangeEndForDate(end.toString()),
      },
    });
  }

  async findPageByUserAndDateRange(
    userId: UserId,
    start: HijriDate,
    end: HijriDate,
    options?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<{ items: FastLog[]; nextCursor?: string }> {
    const result = await this.findInRange({
      pk: userId.toString(),
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

  async countQadaaCompleted(userId: UserId): Promise<number> {
    const logs = await this.findAllWithIndexPrefix({
      pk: userId.toString(),
      indexName: 'typeDateIndex',
      skName: 'typeDate',
      skPrefix: FastLogKey.typeDatePrefixForType('qadaa'),
    });

    return new Set(logs.map((log) => log.date.toString())).size;
  }

  async deleteEntry(userId: UserId, date: HijriDate, eventId: EventId): Promise<void> {
    await this.deleteItem({
      pk: userId.toString(),
      sk: FastLogKey.encodeSk(date.toString(), eventId.toString()),
    });
  }

  protected encodeKeys(log: FastLog): DomainKeys {
    const persistenceItem = FastLogMapper.toPersistence(log);
    return {
      pk: persistenceItem.userId as string,
      sk: persistenceItem.sk as string,
    };
  }

  protected mapToPersistence(log: FastLog): Record<string, unknown> {
    const item = FastLogMapper.toPersistence(log);
    // Remove keys as they are handled by BaseDynamoDBRepository using encodeKeys
    const { userId, sk, ...attributes } = item;
    void userId;
    void sk;
    return attributes;
  }

  protected mapToDomain(item: Record<string, unknown>): FastLog {
    return FastLogMapper.toDomain(item);
  }
}
