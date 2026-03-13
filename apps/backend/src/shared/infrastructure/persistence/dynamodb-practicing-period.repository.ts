import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { IPracticingPeriodRepository } from '../../../contexts/salah/domain/repositories/practicing-period.repository';
import { PracticingPeriod } from '../../../contexts/salah/domain/entities/practicing-period.entity';
import { HijriDate } from '@awdah/shared';
import { settings } from '../../config/settings';
import { PracticingPeriodType } from '@awdah/shared';

export class DynamoDBPracticingPeriodRepository implements IPracticingPeriodRepository {
  private readonly tableName = settings.tables.practicingPeriods;

  constructor(private readonly docClient: DynamoDBDocumentClient) {}

  async save(period: PracticingPeriod): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        userId: period.userId,
        periodId: period.periodId,
        startDate: period.startDate.toString(),
        endDate: period.endDate.toString(),
        type: period.type,
      },
    });

    await this.docClient.send(command);
  }

  async findByUser(userId: string): Promise<PracticingPeriod[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId,
      },
    });

    const response = await this.docClient.send(command);
    return (response.Items || []).map((item) => this.mapToDomain(item));
  }

  async delete(userId: string, periodId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        userId,
        periodId,
      },
    });

    await this.docClient.send(command);
  }

  protected mapToDomain(item: Record<string, unknown>): PracticingPeriod {
    return new PracticingPeriod({
      userId: item.userId as string,
      periodId: item.periodId as string,
      startDate: HijriDate.fromString(item.startDate as string),
      endDate: HijriDate.fromString(item.endDate as string),
      type: item.type as PracticingPeriodType,
    });
  }
}
