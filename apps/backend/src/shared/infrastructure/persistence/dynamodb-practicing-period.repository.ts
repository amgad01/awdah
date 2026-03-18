import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IPracticingPeriodRepository } from '../../../contexts/shared/domain/repositories/practicing-period.repository';
import { PracticingPeriod } from '../../../contexts/shared/domain/entities/practicing-period.entity';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { HijriDate } from '@awdah/shared';
import { settings } from '../../config/settings';

export class DynamoDBPracticingPeriodRepository
  extends BaseDynamoDBRepository<PracticingPeriod>
  implements IPracticingPeriodRepository
{
  constructor(docClient: DynamoDBDocumentClient) {
    super(docClient, settings.tables.practicingPeriods, 'periodId', 'userId');
  }

  async save(period: PracticingPeriod): Promise<void> {
    await this.persist(period);
  }

  async findByUser(userId: string): Promise<PracticingPeriod[]> {
    return this.findAll({ pk: userId });
  }

  async findById(userId: string, periodId: string): Promise<PracticingPeriod | null> {
    return this.retrieve({ pk: userId, sk: periodId });
  }

  async delete(userId: string, periodId: string): Promise<void> {
    await this.deleteItem({ pk: userId, sk: periodId });
  }

  protected encodeKeys(period: PracticingPeriod): DomainKeys {
    return {
      pk: period.userId,
      sk: period.periodId,
    };
  }

  protected mapToPersistence(period: PracticingPeriod): Record<string, unknown> {
    return {
      startDate: period.startDate.toString(),
      endDate: period.endDate.toString(),
      type: period.type,
    };
  }

  protected mapToDomain(item: Record<string, unknown>): PracticingPeriod {
    return new PracticingPeriod({
      userId: item.userId as string,
      periodId: item.periodId as string,
      startDate: HijriDate.fromString(item.startDate as string),
      endDate: HijriDate.fromString(item.endDate as string),
      type: item.type as 'salah' | 'sawm' | 'both',
    });
  }
}
