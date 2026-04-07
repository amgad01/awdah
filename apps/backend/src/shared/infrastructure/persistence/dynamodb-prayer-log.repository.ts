import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IPrayerLogRepository } from '../../../contexts/salah/domain/repositories/prayer-log.repository';
import { PrayerLog } from '../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../contexts/shared/domain/value-objects/log-type';
import { settings } from '../../config/settings';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { PrayerLogKey } from './keys/prayer-log-key';
import { createPrayerSlotKey } from '../../utils/prayer-slot-key';
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
    const buckets = await this.computeQadaaBuckets(userId);
    return Array.from(buckets.values()).reduce(
      (total, bucket) => total + Math.max(0, bucket.prayed - bucket.deselected),
      0,
    );
  }

  async countQadaaCompletedByPrayer(userId: string): Promise<Record<string, number>> {
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
    userId: string,
  ): Promise<Map<string, { prayerName: string; prayed: number; deselected: number }>> {
    const logs = await this.findAllWithIndexPrefix({
      pk: userId,
      indexName: 'typeDateIndex',
      skName: 'typeDate',
      skPrefix: PrayerLogKey.typeDatePrefixForType('qadaa'),
    });

    const buckets = new Map<string, { prayerName: string; prayed: number; deselected: number }>();
    for (const log of logs.sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime())) {
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
      action: log.action,
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
      action: (item.action as 'prayed' | 'deselected') ?? 'prayed',
      loggedAt: new Date(item.loggedAt as string),
      isVoluntary: item.isVoluntary as boolean,
    });
  }
}
