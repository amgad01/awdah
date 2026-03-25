import { HijriDate } from '@awdah/shared';
import type { CombinedHistoryItem } from '@/hooks/use-worship';
import { hijriToGregorianDate } from '@/utils/date-utils';

export type EntryType = 'prayer' | 'fast' | 'period' | 'covered';
export const MAX_HISTORY_RANGE_DAYS = 365;

export interface HistoryEntry {
  eventId: string;
  date: string;
  type: EntryType;
  prayerName?: string;
  logType: string;
  loggedAt: string;
  periodEventKind?: 'start' | 'end';
  periodKind?: string;
}

export function isPrayerItem(
  item: CombinedHistoryItem,
): item is Extract<CombinedHistoryItem, { kind: 'prayer' }> {
  return item.kind === 'prayer';
}

export function isFastItem(
  item: CombinedHistoryItem,
): item is Extract<CombinedHistoryItem, { kind: 'fast' }> {
  return item.kind === 'fast';
}

export function hijriBoundaryIso(dateStr: string, endOfDay = false): string {
  const date = hijriToGregorianDate(dateStr);
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.toISOString();
}

export function formatTime(isoStr: string, locale: string): string {
  return new Date(isoStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function isWithinHistoryRange(startDate: string, endDate: string, maxDays: number): boolean {
  const start = HijriDate.fromString(startDate).toGregorian().getTime();
  const end = HijriDate.fromString(endDate).toGregorian().getTime();
  return Math.floor((end - start) / 86_400_000) <= maxDays;
}
