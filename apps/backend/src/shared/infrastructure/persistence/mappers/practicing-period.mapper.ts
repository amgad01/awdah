import { PracticingPeriod } from '../../../../contexts/shared/domain/entities/practicing-period.entity';
import { HijriDate, UserId, PeriodId } from '@awdah/shared';

export class PracticingPeriodMapper {
  static toPersistence(period: PracticingPeriod): Record<string, unknown> {
    return {
      userId: period.userId.toString(),
      periodId: period.periodId.toString(),
      startDate: period.startDate.toString(),
      endDate: period.endDate?.toString(),
      type: period.type,
    };
  }

  static toDomain(item: Record<string, unknown>): PracticingPeriod {
    return new PracticingPeriod({
      userId: new UserId(item.userId as string),
      periodId: new PeriodId(item.periodId as string),
      startDate: HijriDate.fromString(item.startDate as string),
      endDate: item.endDate ? HijriDate.fromString(item.endDate as string) : undefined,
      type: (item.type as 'salah' | 'sawm' | 'both') ?? 'both',
    });
  }
}
