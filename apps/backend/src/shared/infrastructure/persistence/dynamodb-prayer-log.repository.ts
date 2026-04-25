import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IPrayerLogRepository } from '../../../contexts/salah/domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { PrayerLogKey } from './keys/prayer-log-key';
import { createPrayerSlotKey } from '../../utils/prayer-slot-key';
import { decodeCursor, encodeCursor } from './cursor';
import { PrayerLogMapper } from './mappers/prayer-log.mapper';

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

  async findByUserAndDate(userId: UserId, date: HijriDate): Promise<PrayerLog[]> {
    return this.findAllWithPrefix({
      pk: userId.toString(),
      skPrefix: PrayerLogKey.skPrefixForDate(date.toString()),
    });
  }

  async findByUserAndDateRange(
    userId: UserId,
    start: HijriDate,
    end: HijriDate,
  ): Promise<PrayerLog[]> {
    return this.findAllInRange({
      pk: userId.toString(),
      range: {
        start: PrayerLogKey.skPrefixForDate(start.toString()),
        end: PrayerLogKey.skRangeEndForDate(end.toString()),
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
  ): Promise<{ items: PrayerLog[]; nextCursor?: string }> {
    const result = await this.findInRange({
      pk: userId.toString(),
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

  async countQadaaCompleted(userId: UserId): Promise<number> {
    const buckets = await this.computeQadaaBuckets(userId);
    return Array.from(buckets.values()).reduce(
      (total, bucket) => total + Math.max(0, bucket.prayed - bucket.deselected),
      0,
    );
  }

  async countQadaaCompletedByPrayer(userId: UserId): Promise<Record<string, number>> {
    const buckets = await this.computeQadaaBuckets(userId);
    const counts: Record<string, number> = {};
    for (const bucket of buckets.values()) {
      const net = Math.max(0, bucket.prayed - bucket.deselected);
      if (net > 0) {
        counts[bucket.prayerName] = (counts[bucket.prayerName] ?? 0) + net;
      }
    }
    return counts;
  }

  private async computeQadaaBuckets(
    userId: UserId,
  ): Promise<Map<string, { prayerName: string; prayed: number; deselected: number }>> {
    // Project sk alongside the fields needed for bucketing so mapToDomain can decode it.
    // Without an explicit projection, GSI queries return only key attributes (userId + typeDate).
    const items = await this.queryRawPages({
      pk: userId.toString(),
      indexName: 'typeDateIndex',
      skName: 'typeDate',
      skPrefix: PrayerLogKey.typeDatePrefixForType('qadaa'),
      projectionExpression: '#sk, #type, #action, loggedAt, prayerName, userId',
      expressionAttributeNames: { '#sk': 'sk', '#type': 'type', '#action': 'action' },
    });

    const logs = items
      .map((item) => this.mapToDomain(item))
      .sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());

    const buckets = new Map<string, { prayerName: string; prayed: number; deselected: number }>();
    for (const log of logs) {
      const key = createPrayerSlotKey(log.date.toString(), log.prayerName.getValue());
      const bucket = buckets.get(key) ?? {
        prayerName: log.prayerName.getValue().toLowerCase(),
        prayed: 0,
        deselected: 0,
      };
      if (log.action === 'prayed') {
        bucket.prayed += 1;
      } else {
        bucket.deselected += 1;
      }
      buckets.set(key, bucket);
    }
    return buckets;
  }

  async deleteEntry(
    userId: UserId,
    date: HijriDate,
    prayerName: string,
    eventId: EventId,
  ): Promise<void> {
    await this.deleteItem({
      pk: userId.toString(),
      sk: PrayerLogKey.encodeSk(date.toString(), prayerName, eventId.toString()),
    });
  }

  async hasAnyLogs(userId: UserId): Promise<boolean> {
    return this.existsAny({ pk: userId.toString() });
  }

  protected encodeKeys(log: PrayerLog): DomainKeys {
    const persistence = PrayerLogMapper.toPersistence(log);
    return {
      pk: persistence.userId as string,
      sk: persistence.sk as string,
    };
  }

  protected mapToPersistence(log: PrayerLog): Record<string, unknown> {
    const item = PrayerLogMapper.toPersistence(log);
    const { userId, sk, ...attributes } = item;
    void userId;
    void sk;
    return attributes;
  }

  protected mapToDomain(item: Record<string, unknown>): PrayerLog {
    return PrayerLogMapper.toDomain(item);
  }
}
