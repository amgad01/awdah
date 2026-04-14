import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BaseDynamoDBRepository, type DomainKeys } from '../base-dynamodb.repository';

type Item = {
  pk: string;
  sk: string;
  name: string;
};

class TestRepository extends BaseDynamoDBRepository<Item> {
  constructor(docClient: DynamoDBDocumentClient, tableName: string) {
    super(docClient, tableName, 'sk', 'pk');
  }

  public async listByPk(pk: string): Promise<Item[]> {
    return this.queryAll({ pk });
  }

  public async scanNames(): Promise<Item[]> {
    return this.scanAll({
      tableName: this.tableName,
      projectionExpression: '#pk, #sk, #name',
      expressionAttributeNames: { '#pk': 'pk', '#sk': 'sk', '#name': 'name' },
    });
  }

  protected encodeKeys(entity: Item): DomainKeys {
    return { pk: entity.pk, sk: entity.sk };
  }

  protected mapToPersistence(entity: Item): Record<string, unknown> {
    return { name: entity.name };
  }

  protected mapToDomain(item: Record<string, unknown>): Item {
    return {
      pk: item.pk as string,
      sk: item.sk as string,
      name: item.name as string,
    };
  }
}

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('BaseDynamoDBRepository query and scan helpers', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('collects all query pages through queryAll', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repository = new TestRepository(ddbMock as any, 'Test-Table');

    ddbMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [{ pk: 'USER#1', sk: 'ITEM#1', name: 'Alpha' }],
        LastEvaluatedKey: { pk: 'USER#1', sk: 'ITEM#1' },
      })
      .resolves({
        Items: [{ pk: 'USER#1', sk: 'ITEM#2', name: 'Beta' }],
      });

    const items = await repository.listByPk('USER#1');

    expect(items).toEqual([
      { pk: 'USER#1', sk: 'ITEM#1', name: 'Alpha' },
      { pk: 'USER#1', sk: 'ITEM#2', name: 'Beta' },
    ]);

    expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(2);
  });

  it('collects all scan pages through scanAll', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repository = new TestRepository(ddbMock as any, 'Test-Table');

    ddbMock
      .on(ScanCommand)
      .resolvesOnce({
        Items: [{ pk: 'USER#1', sk: 'ITEM#1', name: 'Alpha' }],
        LastEvaluatedKey: { pk: 'USER#1', sk: 'ITEM#1' },
      })
      .resolves({
        Items: [{ pk: 'USER#1', sk: 'ITEM#2', name: 'Beta' }],
      });

    const items = await repository.scanNames();

    expect(items).toEqual([
      { pk: 'USER#1', sk: 'ITEM#1', name: 'Alpha' },
      { pk: 'USER#1', sk: 'ITEM#2', name: 'Beta' },
    ]);

    const calls = ddbMock.commandCalls(ScanCommand);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.args[0].input).toMatchObject({
      TableName: 'Test-Table',
      ProjectionExpression: '#pk, #sk, #name',
    });
  });
});
