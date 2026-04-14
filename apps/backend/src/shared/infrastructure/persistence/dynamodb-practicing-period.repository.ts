import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IPracticingPeriodRepository } from '../../../contexts/shared/domain/repositories/practicing-period.repository';
import { PracticingPeriod } from '../../../contexts/shared/domain/entities/practicing-period.entity';
import { BaseDynamoDBRepository, DomainKeys } from './base-dynamodb.repository';
import { UserId, PeriodId } from '@awdah/shared';
import { settings } from '../../config/settings';
import { PracticingPeriodMapper } from './mappers/practicing-period.mapper';

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

  async findByUser(userId: UserId): Promise<PracticingPeriod[]> {
    return this.findAll({ pk: userId.toString() });
  }

  async findById(userId: UserId, periodId: PeriodId): Promise<PracticingPeriod | null> {
    return this.retrieve({ pk: userId.toString(), sk: periodId.toString() });
  }

  async delete(userId: UserId, periodId: PeriodId): Promise<void> {
    await this.deleteItem({ pk: userId.toString(), sk: periodId.toString() });
  }

  protected encodeKeys(period: PracticingPeriod): DomainKeys {
    const item = PracticingPeriodMapper.toPersistence(period);
    return {
      pk: item.userId as string,
      sk: item.periodId as string,
    };
  }

  protected mapToPersistence(period: PracticingPeriod): Record<string, unknown> {
    const item = PracticingPeriodMapper.toPersistence(period);
    const { userId, periodId, ...attributes } = item;
    void userId;
    void periodId;
    return attributes;
  }

  protected mapToDomain(item: Record<string, unknown>): PracticingPeriod {
    return PracticingPeriodMapper.toDomain(item);
  }
}
