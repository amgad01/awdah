import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

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
    return this.queryRawInternal(pk);
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
  }: {
    pk: string;
    skPrefix: string;
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
  }): Promise<QueryResult<T>> {
    return this.queryRawInternalPaged(pk, { skPrefix, limit, exclusiveStartKey });
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
  }: {
    pk: string;
    range: { start: string; end: string };
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
  }): Promise<QueryResult<T>> {
    return this.queryRawInternalPaged(pk, { skBetween: range, limit, exclusiveStartKey });
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

    const response = await this.docClient.send(command).catch((error) => {
      throw error;
    });
    return response.Item ? this.mapToDomain(response.Item as Record<string, unknown>) : null;
  }

  /**
   * Saves or updates a domain entity in the database.
   * Automatically executes key encoding and attribute mapping before persistence.
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

    await this.docClient.send(command).catch((error) => {
      throw error;
    });
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

    await this.docClient.send(command).catch((error) => {
      throw error;
    });
  }

  /**
   * Performs a partial update on specific attributes of an existing item.
   * More efficient than persist() for large items as it avoids full replacement.
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

    await this.docClient.send(command).catch((error) => {
      throw error;
    });
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
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: `${this.pkName} = :pk AND begins_with(${skName}, :type)`,
      ExpressionAttributeValues: {
        ':pk': pk,
        ':type': skPrefix,
      },
      Select: 'COUNT',
    });

    const response = await this.docClient.send(command);
    return response.Count || 0;
  }

  /**
   * Internal wrapper for non-paged queries to maintain backward compatibility.
   * Fetches only the first naturally occurring page of results.
   */
  private async queryRawInternal(pkValue: string): Promise<T[]> {
    const { items } = await this.queryRawInternalPaged(pkValue);
    return items;
  }

  /**
   * Centralized query executor for paged operations.
   * Constructs DynamoDB QueryCommands with support for prefix filters, range filters,
   * limits, and starting keys.
   */
  protected async queryRawInternalPaged(
    pkValue: string,
    options?: {
      skPrefix?: string;
      skBetween?: { start: string; end: string };
      indexName?: string;
      limit?: number;
      exclusiveStartKey?: Record<string, unknown>;
    },
  ): Promise<QueryResult<T>> {
    let keyCondition = `${this.pkName} = :pk`;
    const expressionAttributeValues: Record<string, unknown> = { ':pk': pkValue };

    if (options?.skPrefix) {
      keyCondition += ` AND begins_with(${this.skName}, :sk)`;
      expressionAttributeValues[':sk'] = options.skPrefix;
    } else if (options?.skBetween) {
      keyCondition += ` AND ${this.skName} BETWEEN :start AND :end`;
      expressionAttributeValues[':start'] = options.skBetween.start;
      expressionAttributeValues[':end'] = options.skBetween.end;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: options?.indexName,
      KeyConditionExpression: keyCondition,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ExpressionAttributeValues: expressionAttributeValues as Record<string, any>,
      Limit: options?.limit,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ExclusiveStartKey: options?.exclusiveStartKey as Record<string, any>,
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
}

/** Represents a set of items returned from a paged DynamoDB query */
export interface QueryResult<T> {
  /** The fully mapped domain entities for this page */
  items: T[];
  /** The key indicating where DynamoDB stopped, to be used in subsequent requests */
  lastEvaluatedKey?: Record<string, unknown>;
}
