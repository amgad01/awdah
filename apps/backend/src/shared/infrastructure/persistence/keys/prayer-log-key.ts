import { InternalError } from '@awdah/shared';
import { LogKeyBase } from './log-key-base';

const SEP = '#' as const;

export interface PrayerLogSkParts {
  date: string;
  prayer: string;
  eventId: string;
}

export interface PrayerLogTypeDateParts {
  logType: string;
  date: string;
}

/**
 * Codec for DynamoDB sort keys and GSI sort keys used in the prayer log table.
 *
 * SK format:  {date}#{PRAYER_UPPER}#{eventId}   e.g. 1445-09-01#FAJR#01JXXX
 * typeDate:   {logType}#{date}                  e.g. qadaa#1445-09-01
 */
export const PrayerLogKey = {
  encodeSk(date: string, prayer: string, eventId: string): string {
    return [date, prayer.toUpperCase(), eventId].join(SEP);
  },

  decodeSk(sk: string): PrayerLogSkParts {
    const parts = sk.split(SEP);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new InternalError(`Malformed prayer log SK: "${sk}"`);
    }
    return { date: parts[0], prayer: parts[1], eventId: parts[2] };
  },

  skPrefixForDate: LogKeyBase.skPrefixForDate,
  skRangeEndForDate: LogKeyBase.skRangeEndForDate,
  encodeTypeDate: LogKeyBase.encodeTypeDate,
  typeDatePrefixForType: LogKeyBase.typeDatePrefixForType,
};
