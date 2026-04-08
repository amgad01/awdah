import {
  HijriDate,
  type PrayerName as PrayerNameType,
  type LogType as LogTypeT,
} from '@awdah/shared';
import { IPrayerLogRepository } from '../../domain/repositories/prayer-log.repository';
import { decodeCursor, encodeCursor } from '../../../../shared/infrastructure/persistence/cursor';
import { createPrayerSlotKey } from '../../../../shared/utils/prayer-slot-key';

export interface GetPrayerHistoryPageCommand {
  userId: string;
  startDate: string;
  endDate: string;
  limit: number;
  cursor?: string;
}

export interface PrayerHistoryPageDto {
  items: Array<{
    eventId: string;
    date: string;
    prayerName: PrayerNameType;
    type: LogTypeT;
    action: 'prayed' | 'deselected';
    loggedAt: string;
  }>;
  nextCursor?: string;
  hasMore: boolean;
}

export class GetPrayerHistoryPageUseCase {
  constructor(private readonly repository: IPrayerLogRepository) {}

  async execute(command: GetPrayerHistoryPageCommand): Promise<PrayerHistoryPageDto> {
    const start = HijriDate.fromString(command.startDate);
    const end = HijriDate.fromString(command.endDate);
    const decodedCursor = decodePrayerHistoryCursor(command.cursor);

    let page = await this.repository.findPageByUserAndDateRange(command.userId, start, end, {
      limit: command.limit,
      cursor: decodedCursor.rawCursor,
    });
    let rawItems = skipSuppressedSlotLogs(page.items, decodedCursor.suppressedSlotKey);

    while (rawItems.length === 0 && page.nextCursor) {
      page = await this.repository.findPageByUserAndDateRange(command.userId, start, end, {
        limit: command.limit,
        cursor: page.nextCursor,
      });
      rawItems = skipSuppressedSlotLogs(page.items, decodedCursor.suppressedSlotKey);
    }

    // Per-page deduplication.
    // Obligatory: First occurrence of a slot decides the effective action; skip later dupes.
    // Qadaa: net count per (date, prayerName) — return one entry per net unit.
    const seenObligatorySlots = new Set<string>();
    const qadaaBuckets = new Map<
      string,
      { prayed: (typeof rawItems)[number][]; deselected: number }
    >();
    const effectiveItems: (typeof rawItems)[number][] = [];

    for (const log of rawItems) {
      if (log.type.getValue() === 'qadaa') {
        const key = createPrayerSlotKey(log.date.toString(), log.prayerName.getValue());
        const bucket = qadaaBuckets.get(key) ?? { prayed: [], deselected: 0 };
        if (log.action === 'prayed') {
          bucket.prayed.push(log);
        } else {
          bucket.deselected++;
        }
        qadaaBuckets.set(key, bucket);
      } else {
        const key = getPrayerSlotKey(log);
        if (seenObligatorySlots.has(key)) continue;
        seenObligatorySlots.add(key);
        if (log.action === 'prayed') {
          effectiveItems.push(log);
        }
      }
    }

    for (const [, bucket] of qadaaBuckets) {
      const net = Math.max(0, bucket.prayed.length - bucket.deselected);
      for (let i = 0; i < net && i < bucket.prayed.length; i++) {
        effectiveItems.push(bucket.prayed[i]!);
      }
    }

    return {
      items: effectiveItems.map((log) => ({
        eventId: log.eventId,
        date: log.date.toString(),
        prayerName: log.prayerName.getValue(),
        type: log.type.getValue(),
        action: log.action,
        loggedAt: log.loggedAt.toISOString(),
      })),
      nextCursor: encodePrayerHistoryCursor(
        page.nextCursor,
        rawItems.length > 0 ? getPrayerSlotKey(rawItems[rawItems.length - 1]!) : undefined,
      ),
      hasMore: page.nextCursor !== undefined,
    };
  }
}

interface PrayerHistoryCursorPayload {
  key?: Record<string, unknown>;
  suppressedSlotKey?: string;
}

function decodePrayerHistoryCursor(cursor?: string): {
  rawCursor?: string;
  suppressedSlotKey?: string;
} {
  const decoded = decodeCursor(cursor);
  if (!decoded) {
    return {};
  }

  const payload = decoded as PrayerHistoryCursorPayload;
  if ('key' in payload || 'suppressedSlotKey' in payload) {
    return {
      rawCursor: payload.key ? encodeCursor(payload.key) : undefined,
      suppressedSlotKey:
        typeof payload.suppressedSlotKey === 'string' ? payload.suppressedSlotKey : undefined,
    };
  }

  return {
    rawCursor: encodeCursor(decoded),
  };
}

function encodePrayerHistoryCursor(
  rawCursor?: string,
  suppressedSlotKey?: string,
): string | undefined {
  const key = decodeCursor(rawCursor);
  if (!key) {
    return undefined;
  }

  return encodeCursor({
    key,
    suppressedSlotKey,
  });
}

function skipSuppressedSlotLogs<
  T extends {
    date: { toString(): string };
    prayerName: { getValue(): string };
    type: { getValue(): string };
  },
>(logs: T[], suppressedSlotKey?: string): T[] {
  if (!suppressedSlotKey) {
    return logs;
  }

  let startIndex = 0;
  while (startIndex < logs.length && getPrayerSlotKey(logs[startIndex]!) === suppressedSlotKey) {
    startIndex += 1;
  }

  return logs.slice(startIndex);
}

function getPrayerSlotKey(log: {
  date: { toString(): string };
  prayerName: { getValue(): string };
  type: { getValue(): string };
}): string {
  return `${log.date.toString()}#${log.prayerName.getValue()}#${log.type.getValue()}`;
}
