/* eslint-disable no-console */
/**
 * restore-sanitize.ts
 *
 * Removes deleted-user data from one or more restored DynamoDB tables by
 * cross-referencing the live DeletedUsers tombstone table.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createAwsClientConfig } from '../src/shared/infrastructure/aws/client-config';
import {
  BaseDynamoDBRepository,
  type DomainKeys,
} from '../src/shared/infrastructure/persistence/base-dynamodb.repository';
import { deleteKeysInBatches } from '../src/shared/infrastructure/persistence/dynamodb-batch-delete';
import { getArgValue, requireArgValue } from './cli-args';

type TableLookupOptions = {
  tableName: string;
  pk: string;
  skName?: string;
  skPrefix?: string;
  skBetween?: { start: string; end: string };
  projectionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
};

class RestoreDynamoDBRepository extends BaseDynamoDBRepository<Record<string, unknown>> {
  constructor(
    docClient: DynamoDBDocumentClient,
    tableName: string,
    pkName: string,
    skName: string,
  ) {
    super(docClient, tableName, skName, pkName);
  }

  public async queryItems(options: TableLookupOptions): Promise<Record<string, unknown>[]> {
    return this.queryAll(options);
  }

  public async scanItems(options: {
    tableName: string;
    projectionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, unknown>;
  }): Promise<Record<string, unknown>[]> {
    return this.scanAll(options);
  }

  protected encodeKeys(entity: Record<string, unknown>): DomainKeys {
    return {
      pk: String(entity[this.pkName] ?? ''),
      sk: String(entity[this.skName] ?? ''),
    };
  }

  protected mapToPersistence(entity: Record<string, unknown>): Record<string, unknown> {
    return entity;
  }

  protected mapToDomain(item: Record<string, unknown>): Record<string, unknown> {
    return item;
  }
}

function parseArgs(): {
  restoredTables: string[];
  pk: string;
  sk: string | undefined;
  tombstoneTable: string;
  region: string;
  endpoint: string | undefined;
} {
  const args = process.argv.slice(2);

  const tablesStart = args.indexOf('--restored-tables');
  if (tablesStart === -1) throw new Error('Missing required argument: --restored-tables');

  const restoredTables: string[] = [];
  for (let i = tablesStart + 1; i < args.length; i += 1) {
    const value = args[i];
    if (!value || value.startsWith('--')) break;
    restoredTables.push(value);
  }

  if (restoredTables.length === 0) {
    throw new Error('--restored-tables requires at least one table name');
  }

  const env = process.env.DEPLOY_ENV || process.env.APP_ENV || process.env.NODE_ENV || 'dev';

  return {
    restoredTables,
    pk: requireArgValue(args, '--pk'),
    sk: getArgValue(args, '--sk'),
    tombstoneTable: getArgValue(args, '--tombstone-table') ?? `Awdah-DeletedUsers-${env}`,
    region: getArgValue(args, '--region') ?? 'eu-west-1',
    endpoint: getArgValue(args, '--endpoint'),
  };
}

async function scanAllTombstones(
  restoreRepo: RestoreDynamoDBRepository,
  tombstoneTable: string,
): Promise<string[]> {
  const tombstones = await restoreRepo.scanItems({
    tableName: tombstoneTable,
    projectionExpression: '#userId',
    expressionAttributeNames: { '#userId': 'userId' },
  });

  return [
    ...new Set(
      tombstones
        .map((item) => item.userId)
        .filter((userId): userId is string => typeof userId === 'string'),
    ),
  ];
}

async function queryKeysForUser(
  restoreRepo: RestoreDynamoDBRepository,
  tableName: string,
  pkName: string,
  skName: string | undefined,
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  const items = await restoreRepo.queryItems({
    tableName,
    pk: userId,
    skName,
    projectionExpression: skName ? '#pk, #sk' : '#pk',
    expressionAttributeNames: {
      '#pk': pkName,
      ...(skName ? { '#sk': skName } : {}),
    },
  });

  return items.map((item) => {
    const key: Record<string, unknown> = { [pkName]: userId };
    if (skName && item[skName] !== undefined) {
      key[skName] = item[skName];
    }
    return key;
  });
}

async function sanitizeTable(
  docClient: DynamoDBDocumentClient,
  restoreRepo: RestoreDynamoDBRepository,
  tableName: string,
  pkName: string,
  skName: string | undefined,
  deletedUserIds: string[],
): Promise<number> {
  let totalDeleted = 0;

  for (const userId of deletedUserIds) {
    const keys = await queryKeysForUser(restoreRepo, tableName, pkName, skName, userId);
    if (keys.length === 0) continue;

    await deleteKeysInBatches(docClient, tableName, keys);
    totalDeleted += keys.length;
    console.log(`  [${tableName}] user ${userId}: removed ${keys.length} item(s)`);
  }

  return totalDeleted;
}

async function main(): Promise<void> {
  const { restoredTables, pk, sk, tombstoneTable, region, endpoint } = parseArgs();

  const rawClient = new DynamoDBClient(
    createAwsClientConfig({
      region,
      endpoint,
    }),
  );
  const docClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const restoreRepo = new RestoreDynamoDBRepository(docClient, tombstoneTable, pk, sk ?? 'sk');

  console.log(`Reading tombstones from: ${tombstoneTable}`);
  const deletedUserIds = await scanAllTombstones(restoreRepo, tombstoneTable);
  console.log(`Found ${deletedUserIds.length} tombstoned user(s)`);

  if (deletedUserIds.length === 0) {
    console.log('No deleted users - nothing to sanitize.');
    return;
  }

  for (const tableName of restoredTables) {
    console.log(`\nSanitizing: ${tableName}`);
    const removed = await sanitizeTable(docClient, restoreRepo, tableName, pk, sk, deletedUserIds);
    console.log(`  Total items removed: ${removed}`);
  }

  console.log('\nSanitization complete. The restored table(s) are safe to put into service.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
