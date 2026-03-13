import { HijriDate } from '@awdah/shared';
import { PrayerName } from '../value-objects/prayer-name';
import { LogType } from '../../../shared/domain/value-objects/log-type';

export interface PrayerLogProps {
  userId: string;
  date: HijriDate;
  prayerName: PrayerName;
  type: LogType;
  loggedAt: Date;
}

export class PrayerLog {
  constructor(private readonly props: PrayerLogProps) {}

  get userId(): string {
    return this.props.userId;
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
}
