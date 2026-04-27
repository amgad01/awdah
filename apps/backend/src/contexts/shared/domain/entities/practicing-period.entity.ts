import { ValidationError, UserId, PeriodId, ERROR_CODES } from '@awdah/shared';
import { HijriDate } from '@awdah/shared';
import { PracticingPeriodType } from '@awdah/shared';

export interface PracticingPeriodProps {
  userId: UserId;
  periodId: PeriodId;
  startDate: HijriDate;
  endDate?: HijriDate; // undefined = open-ended (user is currently practicing)
  type: PracticingPeriodType;
}

export class PracticingPeriod {
  constructor(private readonly props: PracticingPeriodProps) {
    this.validate();
  }

  private validate(): void {
    if (this.props.endDate && this.props.endDate.isBefore(this.props.startDate)) {
      throw new ValidationError(ERROR_CODES.PERIOD_END_BEFORE_START);
    }
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get periodId(): PeriodId {
    return this.props.periodId;
  }

  get startDate(): HijriDate {
    return this.props.startDate;
  }

  get endDate(): HijriDate | undefined {
    return this.props.endDate;
  }

  get isOpenEnded(): boolean {
    return this.props.endDate === undefined;
  }

  get type(): PracticingPeriodType {
    return this.props.type;
  }

  coversContext(context: 'salah' | 'sawm'): boolean {
    return this.props.type === context || this.props.type === 'both';
  }

  overlapsWith(other: PracticingPeriod): boolean {
    // If other has no endDate it extends to infinity: this.startDate is always before it
    const thisStartBeforeOtherEnd =
      !other.endDate ||
      this.startDate.isBefore(other.endDate) ||
      this.startDate.equals(other.endDate);
    // If this has no endDate it extends to infinity: it always extends past other.startDate
    const thisEndAfterOtherStart =
      !this.props.endDate ||
      this.props.endDate.isAfter(other.startDate) ||
      this.props.endDate.equals(other.startDate);
    return thisStartBeforeOtherEnd && thisEndAfterOtherStart;
  }
}
