import { FastLog } from '../../../../contexts/sawm/domain/entities/fast-log.entity';
import { HijriDate, UserId, EventId, type BreakReason } from '@awdah/shared';
import { LogType } from '../../../../contexts/shared/domain/value-objects/log-type';
import { FastLogKey } from '../keys/fast-log-key';

export class FastLogMapper {
  static toPersistence(log: FastLog): Record<string, unknown> {
    return {
      userId: log.userId.toString(),
      sk: FastLogKey.encodeSk(log.date.toString(), log.eventId.toString()),
      type: log.type.getValue(),
      loggedAt: log.loggedAt.toISOString(),
      typeDate: FastLogKey.encodeTypeDate(log.type.getValue(), log.date.toString()),
      breakReason: log.breakReason,
      isVoluntary: log.isVoluntary,
    };
  }

  static toDomain(item: Record<string, unknown>): FastLog {
    const { date, eventId } = FastLogKey.decodeSk(item.sk as string);
    return new FastLog({
      userId: new UserId(item.userId as string),
      date: HijriDate.fromString(date),
      eventId: new EventId(eventId),
      type: new LogType(item.type as string),
      loggedAt: new Date(item.loggedAt as string),
      breakReason: item.breakReason as BreakReason | undefined,
      isVoluntary: item.isVoluntary as boolean,
    });
  }
}
