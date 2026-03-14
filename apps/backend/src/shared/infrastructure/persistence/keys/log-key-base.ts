const SEP = '#' as const;

/**
 * Shared utilities for DynamoDB sort key and GSI sort key patterns used across
 * all log tables. Both PrayerLogKey and FastLogKey delegate to these.
 */
export const LogKeyBase = {
  /** Prefix for begins_with queries on a specific Hijri date. */
  skPrefixForDate(date: string): string {
    return `${date}${SEP}`;
  },

  /** Upper bound for BETWEEN range queries up to and including a Hijri date. */
  skRangeEndForDate(date: string): string {
    return `${date}${SEP}\uffff`;
  },

  encodeTypeDate(logType: string, date: string): string {
    return `${logType}${SEP}${date}`;
  },

  /** Prefix for begins_with queries on a GSI typeDate by log type. */
  typeDatePrefixForType(logType: string): string {
    return `${logType}${SEP}`;
  },
};
