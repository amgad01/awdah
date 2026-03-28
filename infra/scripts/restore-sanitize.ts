/* eslint-disable no-console */
/**
 * restore-sanitize.ts
 *
 * Removes deleted-user data from one or more restored DynamoDB tables by
 * cross-referencing the live DeletedUsers tombstone table.
 *
 * Run this against every restored table BEFORE you put it back into service.
 * It reads the tombstone ledger (which is never backed up and always live),
 * then batch-deletes every item that belongs to a tombstoned userId.
 *
 * Usage:
 *   npx ts-node infra/scripts/restore-sanitize.ts \
 *     --restored-tables Awdah-PrayerLogs-prod-restored \
 *                       Awdah-FastLogs-prod-restored \
 *     --pk              userId \
 *     --sk              sk \
 *     [--tombstone-table Awdah-DeletedUsers-prod] \
 *     [--region          eu-west-1] \
 *     [--endpoint        http://localhost:4566]
 *
 * --endpoint is only used for local testing against LocalStack.
 * --tombstone-table defaults to Awdah-DeletedUsers-dev (NODE_ENV fallback).
 * --pk and --sk are the key attribute names for the RESTORED tables.
 *   For tables with a composite key, both --pk and --sk are required.
 *   For tables with only a partition key (e.g. a single-pk table), omit --sk.
 */

import {
  AttributeValue,
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';

const BATCH_SIZE = 25;
const SCAN_PAGE_LIMIT = 500;

function parseArgs(): {
  restoredTables: string[];
  pk: string;
  sk: string | undefined;
  tombstoneTable: string;
  region: string;
  endpoint: string | undefined;
} {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  const require = (flag: string): string => {
    const v = get(flag);
    if (!v) throw new Error(`Missing required argument: ${flag}`);
    return v;
  };

  // Collect all values after --restored-tables until the next --flag
  const tablesStart = args.indexOf('--restored-tables');
  if (tablesStart === -1) throw new Error('Missing required argument: --restored-tables');
  const restoredTables: string[] = [];
  for (let i = tablesStart + 1; i < args.length; i++) {
    if (args[i]!.startsWith('--')) break;
    restoredTables.push(args[i]!);
  }
  if (restoredTables.length === 0)
    throw new Error('--restored-tables requires at least one table name');

  const env = process.env.NODE_ENV ?? 'dev';
  return {
    restoredTables,
    pk: require('--pk'),
    sk: get('--sk'),
    tombstoneTable: get('--tombstone-table') ?? `Awdah-DeletedUsers-${env}`,
    region: get('--region') ?? 'eu-west-1',
    endpoint: get('--endpoint'),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scanAllTombstones(
  client: DynamoDBClient,
  tombstoneTable: string,
): Promise<string[]> {
  const userIds: string[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tombstoneTable,
        ProjectionExpression: 'userId',
        Limit: SCAN_PAGE_LIMIT,
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of result.Items ?? []) {
      if (item['userId']?.S) userIds.push(item['userId'].S);
    }
    lastKey = result.LastEvaluatedKey as Record<string, AttributeValue> | undefined;
  } while (lastKey !== undefined);

  return [...new Set(userIds)];
}

async function queryKeysForUser(
  client: DynamoDBClient,
  tableName: string,
  pk: string,
  sk: string | undefined,
  userId: string,
): Promise<Array<Record<string, { S: string }>>> {
  const keys: Array<Record<string, { S: string }>> = [];
  let lastKey: Record<string, { S: string }> | undefined;

  do {
    const projectionParts = sk ? `${pk}, ${sk}` : pk;
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: '#pk = :uid',
        ExpressionAttributeNames: { '#pk': pk },
        ExpressionAttributeValues: { ':uid': { S: userId } },
        ProjectionExpression: projectionParts,
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of result.Items ?? []) {
      const key: Record<string, { S: string }> = { [pk]: { S: userId } };
      if (sk && item[sk]?.S) key[sk] = { S: item[sk]!.S! };
      keys.push(key);
    }
    lastKey = result.LastEvaluatedKey as Record<string, { S: string }> | undefined;
  } while (lastKey !== undefined);

  return keys;
}

async function batchDelete(
  client: DynamoDBClient,
  tableName: string,
  keys: Array<Record<string, { S: string }>>,
): Promise<void> {
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    let unprocessed: typeof batch = batch;

    // Retry unprocessed items with exponential backoff
    let attempt = 0;
    while (unprocessed.length > 0) {
      const result = await client.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: unprocessed.map((k) => ({ DeleteRequest: { Key: k } })),
          },
        }),
      );
      const remaining = result.UnprocessedItems?.[tableName];
      unprocessed =
        remaining?.map((r) => r.DeleteRequest!.Key! as Record<string, { S: string }>) ?? [];
      if (unprocessed.length > 0) {
        await sleep(Math.pow(2, attempt) * 50);
        attempt++;
      }
    }
  }
}

async function sanitizeTable(
  client: DynamoDBClient,
  tableName: string,
  pk: string,
  sk: string | undefined,
  deletedUserIds: string[],
): Promise<number> {
  let totalDeleted = 0;

  for (const userId of deletedUserIds) {
    const keys = await queryKeysForUser(client, tableName, pk, sk, userId);
    if (keys.length > 0) {
      await batchDelete(client, tableName, keys);
      totalDeleted += keys.length;
      console.log(`  [${tableName}] user ${userId}: removed ${keys.length} item(s)`);
    }
  }

  return totalDeleted;
}

async function main(): Promise<void> {
  const { restoredTables, pk, sk, tombstoneTable, region, endpoint } = parseArgs();

  const client = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });

  console.log(`Reading tombstones from: ${tombstoneTable}`);
  const deletedUserIds = await scanAllTombstones(client, tombstoneTable);
  console.log(`Found ${deletedUserIds.length} tombstoned user(s)`);

  if (deletedUserIds.length === 0) {
    console.log('No deleted users — nothing to sanitize.');
    return;
  }

  for (const tableName of restoredTables) {
    console.log(`\nSanitizing: ${tableName}`);
    const removed = await sanitizeTable(client, tableName, pk, sk, deletedUserIds);
    console.log(`  Total items removed: ${removed}`);
  }

  console.log('\nSanitization complete. The restored table(s) are safe to put into service.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
