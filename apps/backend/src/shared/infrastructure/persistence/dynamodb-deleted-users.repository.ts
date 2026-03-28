import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { settings } from '../../config/settings';
import type {
  DeletedUserRecord,
  IDeletedUsersRepository,
} from '../../../contexts/user/domain/repositories/deleted-users.repository';

const MAX_BATCH_SIZE = 25;

export class DynamoDBDeletedUsersRepository implements IDeletedUsersRepository {
  private readonly tableName = settings.tables.deletedUsers;

  constructor(private readonly docClient: DynamoDBDocumentClient) {}

  async recordDeletion(userId: string, deletedAt: string): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { userId, deletedAt },
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
          ProjectionExpression: 'userId, deletedAt',
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      for (const item of result.Items ?? []) {
        records.push({ userId: item.userId as string, deletedAt: item.deletedAt as string });
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey !== undefined);

    return records;
  }

  async deleteOlderThan(cutoffIso: string): Promise<number> {
    const all = await this.listAll();
    const stale = all.filter((r) => r.deletedAt < cutoffIso);

    if (stale.length === 0) return 0;

    for (let i = 0; i < stale.length; i += MAX_BATCH_SIZE) {
      const batch = stale.slice(i, i + MAX_BATCH_SIZE);
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map((r) => ({
              DeleteRequest: { Key: { userId: r.userId, deletedAt: r.deletedAt } },
            })),
          },
        }),
      );
    }

    return stale.length;
  }
}
