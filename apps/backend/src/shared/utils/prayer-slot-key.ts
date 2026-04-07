const PRAYER_SLOT_KEY_SEPARATOR = '#' as const;

export function createPrayerSlotKey(date: string, prayerName: string): string {
  return `${date}${PRAYER_SLOT_KEY_SEPARATOR}${prayerName}`;
}
