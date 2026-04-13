import { PrayerLog } from '../../../../contexts/salah/domain/entities/prayer-log.entity';
import { HijriDate, UserId, EventId } from '@awdah/shared';
import { PrayerName } from '../../../../contexts/salah/domain/value-objects/prayer-name';
import { LogType } from '../../../../contexts/shared/domain/value-objects/log-type';
import { PrayerLogKey } from '../keys/prayer-log-key';

export class PrayerLogMapper {
  static toPersistence(log: PrayerLog): Record<string, unknown> {
    return {
      userId: log.userId.toString(),
      sk: PrayerLogKey.encodeSk(
        log.date.toString(),
        log.prayerName.getValue(),
        log.eventId.toString(),
      ),
      type: log.type.getValue(),
      action: log.action,
      loggedAt: log.loggedAt.toISOString(),
      typeDate: PrayerLogKey.encodeTypeDate(log.type.getValue(), log.date.toString()),
      isVoluntary: log.isVoluntary,
    };
  }

  static toDomain(item: Record<string, unknown>): PrayerLog {
    const { date, prayer, eventId } = PrayerLogKey.decodeSk(item.sk as string);
    return new PrayerLog({
      userId: new UserId(item.userId as string),
      date: HijriDate.fromString(date),
      prayerName: new PrayerName(prayer.toLowerCase()),
      eventId: new EventId(eventId),
      type: new LogType(item.type as string),
      action: (item.action as 'prayed' | 'deselected') ?? 'prayed',
      loggedAt: new Date(item.loggedAt as string),
      isVoluntary: item.isVoluntary as boolean,
    });
  }
}
