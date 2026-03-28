import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  QueryCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  type BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { InternalError } from '@awdah/shared';

const MAX_BATCH_DELETE_ATTEMPTS = 5;
const BATCH_DELETE_RETRY_BASE_DELAY_MS = 50;

export interface DomainKeys {
  pk: string;
  sk: string;
}

/**
 * Base class for DynamoDB repositories providing common operations and automatic domain mapping.
 * Supports configurable partition key (PK) and sort key (SK) names.
 */
export abstract class BaseDynamoDBRepository<T> {
  protected constructor(
    protected readonly docClient: DynamoDBDocumentClient,
    protected readonly tableName: string,
    protected readonly skName: string,
    protected readonly pkName: string,
  ) {}

  /**
   * Retrieves all items associated with a specific partition key (PK).
   * Useful for one-to-many relationships where all children fit in a single partition.
   *
   * @param pk - The partition key value to query for.
   * @returns A promise that resolves to an array of domain entities.
   */
  protected async findAll({ pk }: { pk: string }): Promise<T[]> {
    return this.collectAllPages((exclusiveStartKey) =>
      this.queryRawInternalPaged(pk, {
        exclusiveStartKey,
      }),
    );
  }

  /**
   * Retrieves items for a partition key where the sort key (SK) starts with a specific prefix.
   * Supports pagination via limit and exclusiveStartKey.
   *
   * @param pk - The partition key value.
   * @param skPrefix - The prefix that the sort key must start with.
   * @param limit - Optional maximum number of items to retrieve (paged).
   * @param exclusiveStartKey - Optional key to start the query from (for following pages).
   * @returns A paged result containing items and potentially a lastEvaluatedKey.
   */
  protected async findWithPrefix({
    pk,
    skPrefix,
    limit,
    exclusiveStartKey,
    scanIndexForward,
  }: {
    pk: string;
    skPrefix: string;
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
    scanIndexForward?: boolean;
  }): Promise<QueryResult<T>> {
    return this.queryRawInternalPaged(pk, { skPrefix, limit, exclusiveStartKey, scanIndexForward });
  }

  /**
   * Retrieves all items for a partition key where the sort key begins with a given prefix.
   */
  protected async findAllWithPrefix({
    pk,
    skPrefix,
  }: {
    pk: string;
    skPrefix: string;
  }): Promise<T[]> {
    return this.collectAllPages((exclusiveStartKey) =>
      this.findWithPrefix({
        pk,
        skPrefix,
        exclusiveStartKey,
      }),
    );
  }

  /**
   * Retrieves items for a partition key where the sort key (SK) falls within a specific range.
   * Commonly used for time-series data or lexicographical ranges.
   *
   * @param pk - The partition key value.
   * @param range - The start and end strings for the BETWEEN condition.
   * @param limit - Optional pagination limit.
   * @param exclusiveStartKey - Optional pagination start key.
   * @returns A paged result containing matching domain entities.
   */
  protected async findInRange({
    pk,
    range,
    limit,
    exclusiveStartKey,
    scanIndexForward,
  }: {
    pk: string;
    range: { start: string; end: string };
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
    scanIndexForward?: boolean;
  }): Promise<QueryResult<T>> {
    return this.queryRawInternalPaged(pk, {
      skBetween: range,
      limit,
      exclusiveStartKey,
      scanIndexForward,
    });
  }

  /**
   * Retrieves all items for a partition key where the sort key falls within a range.
   */
  protected async findAllInRange({
    pk,
    range,
  }: {
    pk: string;
    range: { start: string; end: string };
  }): Promise<T[]> {
    return this.collectAllPages((exclusiveStartKey) =>
      this.findInRange({
        pk,
        range,
        exclusiveStartKey,
      }),
    );
  }

  /**
   * Retrieves a single domain entity by its exact Primary Key (PK) and Sort Key (SK).
   *
   * @param pk - The partition key value.
   * @param sk - The sort key value.
   * @returns The matching entity, or null if not found.
   */
  protected async retrieve({ pk, sk }: DomainKeys): Promise<T | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        [this.pkName]: pk,
        [this.skName]: sk,
      },
    });

    const response = await this.docClient.send(command);
    return response.Item ? this.mapToDomain(response.Item as Record<string, unknown>) : null;
  }

  /**
   * Saves or updates a complete domain entity in the database (Upsert).
   *
   * RECOMMENDATION: Use this as the default method for Aggregate Roots to ensure
   * domain consistency of the entire record. Replaces all attributes if the item exists.
   *
   * @param entity - The domain entity to persist.
   */
  protected async persist(entity: T): Promise<void> {
    const keys = this.encodeKeys(entity);
    const attributes = this.mapToPersistence(entity);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        [this.pkName]: keys.pk,
        [this.skName]: keys.sk,
        ...attributes,
      },
    });

    await this.docClient.send(command);
  }

  /**
   * Creates a new item in the database, but FAILS if it already exists.
   * This provides a "creation guard" to prevent accidental overwrites.
   *
   * @param entity - The domain entity to create.
   * @throws Error if the item already exists (ConditionalCheckFailedException).
   */
  protected async createOnly(entity: T): Promise<void> {
    const keys = this.encodeKeys(entity);
    const attributes = this.mapToPersistence(entity);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        [this.pkName]: keys.pk,
        [this.skName]: keys.sk,
        ...attributes,
      },
      ConditionExpression: `attribute_not_exists(${this.pkName})`,
    });

    await this.docClient.send(command);
  }

  /**
   * Performs a partial update on specific attributes of an existing item.
   *
   * RECOMMENDATION: Use for performance optimization (large items) or when multiple
   * users/processes need to update independent fields concurrently without
   * a full "read-modify-write" cycle.
   *
   * @param keys - The PK and SK of the item to update.
   * @param updates - A key-value map of attributes to update.
   */
  protected async updatePartial(keys: DomainKeys, updates: Record<string, unknown>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        [this.pkName]: keys.pk,
        [this.skName]: keys.sk,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await this.docClient.send(command);
  }

  /**
   * Deletes a specific item by its exact Primary Key and Sort Key.
   *
   * @param pk - The partition key.
   * @param sk - The sort key.
   */
  protected async deleteItem({ pk, sk }: DomainKeys): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        [this.pkName]: pk,
        [this.skName]: sk,
      },
    });
    await this.docClient.send(command);
  }

  /**
   * Deletes all items for a given partition key using paginated queries and batch deletes.
   * Suitable for "clear all records for a user" operations.
   *
   * @param pk - The partition key value whose items should be deleted.
   */
  protected async deleteAll({ pk }: { pk: string }): Promise<void> {
    let lastKey: Record<string, unknown> | undefined;
    do {
      const queryResult = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': this.pkName },
          ExpressionAttributeValues: { ':pk': pk },
          ProjectionExpression: `${this.pkName}, ${this.skName}`,
          ExclusiveStartKey: lastKey,
        }),
      );
      const keys = (queryResult.Items ?? []) as Record<string, unknown>[];
      lastKey = queryResult.LastEvaluatedKey as Record<string, unknown> | undefined;
      await this.deleteKeysInBatches(
        this.tableName,
        keys.map((key) => ({ [this.pkName]: key[this.pkName], [this.skName]: key[this.skName] })),
      );
    } while (lastKey);
  }

  /**
   * Deletes arbitrary keys in DynamoDB-sized batches with bounded retries for unprocessed items.
   */
  protected async deleteKeysInBatches(
    tableName: string,
    keys: Array<Record<string, unknown>>,
  ): Promise<void> {
    for (let i = 0; i < keys.length; i += 25) {
      const batch = keys.slice(i, i + 25);
      let requestItems: BatchWriteCommandInput['RequestItems'] = {
        [tableName]: batch.map((key) => ({
          DeleteRequest: { Key: key },
        })),
      };

      for (let attempt = 1; this.hasPendingBatchWrites(requestItems); attempt += 1) {
        const result: { UnprocessedItems?: BatchWriteCommandInput['RequestItems'] } =
          await this.docClient.send(new BatchWriteCommand({ RequestItems: requestItems }));
        requestItems = result.UnprocessedItems;

        if (!this.hasPendingBatchWrites(requestItems)) break;

        if (attempt >= MAX_BATCH_DELETE_ATTEMPTS) {
          throw new InternalError(
            `Failed to delete all batch items from ${tableName} after ${MAX_BATCH_DELETE_ATTEMPTS} attempts`,
          );
        }

        await this.sleep(this.getBatchDeleteRetryDelayMs(attempt));
      }
    }
  }

  /**
   * Performs an efficient count operation using a Global Secondary Index (GSI).
   * Best for calculating aggregate counts without scanning the entire table.
   *
   * @param pk - The partition key for the GSI query.
   * @param indexName - The name of the GSI to use.
   * @param skName - The attribute name for the GSI sort key.
   * @param skPrefix - The prefix for the begins_with condition on the GSI sort key.
   * @returns The number of matching items.
   */
  protected async countByGSI({
    pk,
    indexName,
    skName,
    skPrefix,
  }: {
    pk: string;
    indexName: string;
    skName: string;
    skPrefix: string;
  }): Promise<number> {
    let total = 0;
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: `${this.pkName} = :pk AND begins_with(${skName}, :type)`,
        ExpressionAttributeValues: {
          ':pk': pk,
          ':type': skPrefix,
        },
        Select: 'COUNT',
        ExclusiveStartKey: exclusiveStartKey,
      });

      const response = await this.docClient.send(command);
      total += response.Count || 0;
      exclusiveStartKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (exclusiveStartKey);

    return total;
  }

  /**
   * Retrieves all items from a GSI where the sort key starts with a specific prefix.
   */
  protected async findAllWithIndexPrefix({
    pk,
    indexName,
    skName,
    skPrefix,
  }: {
    pk: string;
    indexName: string;
    skName: string;
    skPrefix: string;
  }): Promise<T[]> {
    return this.collectAllPages((exclusiveStartKey) =>
      this.queryRawInternalPaged(pk, {
        indexName,
        skName,
        skPrefix,
        exclusiveStartKey,
      }),
    );
  }

  /**
   * Centralized query executor for paged operations.
   * Constructs DynamoDB QueryCommands with support for prefix filters, range filters,
   * limits, and starting keys.
   */
  protected async queryRawInternalPaged(
    pkValue: string,
    options?: {
      skName?: string;
      skPrefix?: string;
      skBetween?: { start: string; end: string };
      indexName?: string;
      limit?: number;
      exclusiveStartKey?: Record<string, unknown>;
      scanIndexForward?: boolean;
    },
  ): Promise<QueryResult<T>> {
    const skName = options?.skName ?? this.skName;
    let keyCondition = `${this.pkName} = :pk`;
    const expressionAttributeValues: Record<string, unknown> = { ':pk': pkValue };

    if (options?.skPrefix) {
      keyCondition += ` AND begins_with(${skName}, :sk)`;
      expressionAttributeValues[':sk'] = options.skPrefix;
    } else if (options?.skBetween) {
      keyCondition += ` AND ${skName} BETWEEN :start AND :end`;
      expressionAttributeValues[':start'] = options.skBetween.start;
      expressionAttributeValues[':end'] = options.skBetween.end;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: options?.indexName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionAttributeValues as Record<string, unknown>,
      Limit: options?.limit,
      ScanIndexForward: options?.scanIndexForward,
      ExclusiveStartKey: options?.exclusiveStartKey,
    });

    const response = await this.docClient.send(command);
    const items = (response.Items || []).map((item) =>
      this.mapToDomain(item as Record<string, unknown>),
    );

    return {
      items,
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  /**
   * Abstract method to determine the PK and SK for a given domain entity.
   */
  protected abstract encodeKeys(entity: T): DomainKeys;

  /**
   * Abstract method to serialize a domain entity into its persistence-layer attributes.
   */
  protected abstract mapToPersistence(entity: T): Record<string, unknown>;

  /**
   * Abstract method to map a raw DynamoDB record back to a domain-level entity.
   */
  protected abstract mapToDomain(item: Record<string, unknown>): T;

  private hasPendingBatchWrites(requestItems: BatchWriteCommandInput['RequestItems']): boolean {
    if (!requestItems) return false;
    return Object.values(requestItems).some((requests) => (requests?.length ?? 0) > 0);
  }

  private async collectAllPages(
    fetchPage: (exclusiveStartKey?: Record<string, unknown>) => Promise<QueryResult<T>>,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const { items, lastEvaluatedKey } = await fetchPage(lastKey);
      allItems.push(...items);
      lastKey = lastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return allItems;
  }

  private getBatchDeleteRetryDelayMs(attempt: number): number {
    const exponentialDelay = BATCH_DELETE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    const halfDelay = Math.floor(exponentialDelay / 2);
    return halfDelay + Math.floor(Math.random() * Math.max(halfDelay, 1));
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Represents a set of items returned from a paged DynamoDB query */
export interface QueryResult<T> {
  /** The fully mapped domain entities for this page */
  items: T[];
  /** The key indicating where DynamoDB stopped, to be used in subsequent requests */
  lastEvaluatedKey?: Record<string, unknown>;
}
