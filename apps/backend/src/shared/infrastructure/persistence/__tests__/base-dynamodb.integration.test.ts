import { describe, it, expect, beforeAll } from 'vitest';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BaseDynamoDBRepository, DomainKeys } from '../base-dynamodb.repository';

// These tests require a running LocalStack instance at localhost:4566.
// They are skipped automatically when LOCALSTACK_AVAILABLE is not set to 'true'.
const localstackAvailable = process.env.LOCALSTACK_AVAILABLE === 'true';

// Concrete implementation for testing
class TestRepository extends BaseDynamoDBRepository<{
  id: string;
  name: string;
  updated?: string;
}> {
  constructor(docClient: DynamoDBDocumentClient, tableName: string) {
    super(docClient, tableName, 'sk', 'pk');
  }

  public async create(entity: { id: string; name: string }) {
    return this.createOnly(entity);
  }

  public async update(id: string, updates: Record<string, unknown>) {
    return this.updatePartial({ pk: 'USER#1', sk: `ITEM#${id}` }, updates);
  }

  public async get(id: string) {
    return this.retrieve({ pk: 'USER#1', sk: `ITEM#${id}` });
  }

  protected encodeKeys(entity: { id: string; name: string }): DomainKeys {
    return { pk: 'USER#1', sk: `ITEM#${entity.id}` };
  }

  protected mapToPersistence(entity: {
    id: string;
    name: string;
    updated?: string;
  }): Record<string, unknown> {
    return { name: entity.name, updated: entity.updated };
  }

  protected mapToDomain(item: Record<string, unknown>): {
    id: string;
    name: string;
    updated?: string;
  } {
    return {
      id: (item.sk as string).replace('ITEM#', ''),
      name: item.name as string,
      updated: item.updated as string,
    };
  }
}

describe.skipIf(!localstackAvailable)('BaseDynamoDBRepository Integration (LocalStack)', () => {
  const tableName = 'Test-Integration-Table';
  const client = new DynamoDBClient({
    region: 'eu-west-1',
    endpoint: 'http://localhost:4566',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  const docClient = DynamoDBDocumentClient.from(client);
  const repo = new TestRepository(docClient, tableName);

  beforeAll(async () => {
    // Ensure table exists in LocalStack
    try {
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' },
          ],
          AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
          ],
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }),
      );
    } catch {
      // Ignore if table already exists
    }
  });

  it('createOnly should prevent duplicates', async () => {
    const id = `dup-${Date.now()}`;
    const item = { id, name: 'Original' };

    await repo.create(item);

    // Attempting to create again should fail
    await expect(repo.create(item)).rejects.toThrow();
  });

  it('updatePartial should perform atomic field updates', async () => {
    const id = `partial-${Date.now()}`;
    await repo.create({ id, name: 'Before' });

    await repo.update(id, { updated: 'Yes', name: 'After' });

    const result = await repo.get(id);
    expect(result?.name).toBe('After');
    expect(result?.updated).toBe('Yes');
  });
});
