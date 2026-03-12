import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

export abstract class BaseDynamoDBRepository<T> {
  protected constructor(
    protected readonly docClient: DynamoDBDocumentClient,
    protected readonly tableName: string,
  ) { }

  protected async queryByPartitionKey(
    userId: string,
    options?: {
      skPrefix?: string;
      skBetween?: { start: string; end: string };
      indexName?: string;
    },
  ): Promise<Record<string, unknown>[]> {
    let keyCondition = 'userId = :uid';
    const expressionAttributeValues: Record<string, unknown> = { ':uid': userId };

    if (options?.skPrefix) {
      keyCondition += ' AND begins_with(sk, :sk)';
      expressionAttributeValues[':sk'] = options.skPrefix;
    } else if (options?.skBetween) {
      keyCondition += ' AND sk BETWEEN :start AND :end';
      expressionAttributeValues[':start'] = options.skBetween.start;
      expressionAttributeValues[':end'] = options.skBetween.end;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: options?.indexName,
      KeyConditionExpression: keyCondition,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ExpressionAttributeValues: expressionAttributeValues as Record<string, any>,
    });

    const response = await this.docClient.send(command);
    return (response.Items as Record<string, unknown>[]) || [];
  }

  protected async countByGSI(userId: string, indexName: string, skPrefix: string): Promise<number> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: 'userId = :uid AND begins_with(typeDate, :type)',
      ExpressionAttributeValues: {
        ':uid': userId,
        ':type': skPrefix,
      },
      Select: 'COUNT',
    });

    const response = await this.docClient.send(command);
    return response.Count || 0;
  }

  protected abstract mapToDomain(item: Record<string, unknown>): T;
}
