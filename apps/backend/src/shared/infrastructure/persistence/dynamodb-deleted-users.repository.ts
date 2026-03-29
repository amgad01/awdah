import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { settings } from '../../config/settings';
import type {
  DeletedUserRecord,
  IDeletedUsersRepository,
} from '../../../contexts/user/domain/repositories/deleted-users.repository';

export class DynamoDBDeletedUsersRepository implements IDeletedUsersRepository {
  private readonly tableName = settings.tables.deletedUsers;

  constructor(private readonly docClient: DynamoDBDocumentClient) {}

  async recordDeletion(userId: string, deletedAt: string, expiresAt: number): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { userId, deletedAt, expiresAt },
      }),
    );
  }

  async listAll(): Promise<DeletedUserRecord[]> {
    const records: DeletedUserRecord[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          ProjectionExpression: 'userId, deletedAt, expiresAt',
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      for (const item of result.Items ?? []) {
        records.push({
          userId: item.userId as string,
          deletedAt: item.deletedAt as string,
          expiresAt: item.expiresAt as number,
        });
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey !== undefined);

    return records;
  }
}
