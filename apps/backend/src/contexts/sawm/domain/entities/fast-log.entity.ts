import { HijriDate, UserId, EventId, type BreakReason } from '@awdah/shared';
import { LogType } from '../../../shared/domain/value-objects/log-type';

export interface FastLogProps {
  userId: UserId;
  eventId: EventId;
  date: HijriDate;
  type: LogType;
  loggedAt: Date;
  breakReason?: BreakReason;
  isVoluntary?: boolean;
}

export class FastLog {
  constructor(private readonly props: FastLogProps) {}

  get userId(): UserId {
    return this.props.userId;
  }

  get eventId(): EventId {
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

  get breakReason(): BreakReason | undefined {
    return this.props.breakReason;
  }

  get isVoluntary(): boolean {
    return this.props.isVoluntary ?? false;
  }
}
