import { InternalError } from '@awdah/shared';
import { LogKeyBase } from './log-key-base';

const SEP = '#' as const;

export interface FastLogSkParts {
  date: string;
  eventId: string;
}

/**
 * Codec for DynamoDB sort keys and GSI sort keys used in the fast log table.
 *
 * SK format:  {date}#{eventId}    e.g. 1445-09-01#01JXXX
 * typeDate:   {logType}#{date}    e.g. qadaa#1445-09-01
 */
export const FastLogKey = {
  encodeSk(date: string, eventId: string): string {
    return [date, eventId].join(SEP);
  },

  decodeSk(sk: string): FastLogSkParts {
    const parts = sk.split(SEP);
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new InternalError(`Malformed fast log SK: "${sk}"`);
    }
    return { date: parts[0], eventId: parts[1] };
  },

  skPrefixForDate: LogKeyBase.skPrefixForDate,
  skRangeEndForDate: LogKeyBase.skRangeEndForDate,
  encodeTypeDate: LogKeyBase.encodeTypeDate,
  typeDatePrefixForType: LogKeyBase.typeDatePrefixForType,
};
