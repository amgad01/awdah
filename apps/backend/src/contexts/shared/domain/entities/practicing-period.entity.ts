import { ValidationError } from '@awdah/shared';
import { HijriDate } from '@awdah/shared';
import { PracticingPeriodType } from '@awdah/shared';

export interface PracticingPeriodProps {
  userId: string;
  periodId: string;
  startDate: HijriDate;
  endDate: HijriDate;
  type: PracticingPeriodType;
}

export class PracticingPeriod {
  constructor(private readonly props: PracticingPeriodProps) {
    this.validate();
  }

  private validate(): void {
    if (this.props.endDate.isBefore(this.props.startDate)) {
      throw new ValidationError('Practicing period end date cannot be before start date');
    }
  }

  get userId(): string {
    return this.props.userId;
  }

  get periodId(): string {
    return this.props.periodId;
  }

  get startDate(): HijriDate {
    return this.props.startDate;
  }

  get endDate(): HijriDate {
    return this.props.endDate;
  }

  get type(): PracticingPeriodType {
    return this.props.type;
  }

  coversContext(context: 'salah' | 'sawm'): boolean {
    return this.props.type === context || this.props.type === 'both';
  }

  overlapsWith(other: PracticingPeriod): boolean {
    return (
      (this.startDate.isBefore(other.endDate) || this.startDate.equals(other.endDate)) &&
      (this.endDate.isAfter(other.startDate) || this.endDate.equals(other.startDate))
    );
  }
}
