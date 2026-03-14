import { HijriDate } from '@awdah/shared';
import { LogType } from '../../../shared/domain/value-objects/log-type';

export interface FastLogProps {
  userId: string;
  eventId: string;
  date: HijriDate;
  type: LogType;
  loggedAt: Date;
}

export class FastLog {
  constructor(private readonly props: FastLogProps) {}

  get userId(): string {
    return this.props.userId;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get date(): HijriDate {
    return this.props.date;
  }

  get type(): LogType {
    return this.props.type;
  }

  get loggedAt(): Date {
    return this.props.loggedAt;
  }
}
