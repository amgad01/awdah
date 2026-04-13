import { HijriDate, UserId, EventId } from '@awdah/shared';
import { PrayerName } from '../value-objects/prayer-name';
import { LogType } from '../../../shared/domain/value-objects/log-type';

export interface PrayerLogProps {
  userId: UserId;
  eventId: EventId;
  date: HijriDate;
  prayerName: PrayerName;
  type: LogType;
  loggedAt: Date;
  action: 'prayed' | 'deselected';
  isVoluntary?: boolean;
}

export class PrayerLog {
  constructor(private readonly props: PrayerLogProps) {}

  get userId(): UserId {
    return this.props.userId;
  }

  get eventId(): EventId {
    return this.props.eventId;
  }

  get date(): HijriDate {
    return this.props.date;
  }

  get prayerName(): PrayerName {
    return this.props.prayerName;
  }

  get type(): LogType {
    return this.props.type;
  }

  get loggedAt(): Date {
    return this.props.loggedAt;
  }

  get action(): 'prayed' | 'deselected' {
    return this.props.action;
  }

  get isVoluntary(): boolean {
    return this.props.isVoluntary ?? false;
  }
}
