/* eslint-disable no-console */
/**
 * restore-from-s3.ts
 *
 * Restores a DynamoDB table from a daily S3 export snapshot using the native
 * DynamoDB ImportTable API (DYNAMODB_JSON format). Creates a NEW table — it
 * never touches existing live tables.
 *
 * Usage:
 *   npx ts-node infra/scripts/restore-from-s3.ts \
 *     --bucket   awdah-backups-prod-123456789012 \
 *     --prefix   exports/2026-03-28/Awdah-PrayerLogs-prod \
 *     --table    Awdah-PrayerLogs-prod-restored-20260328 \
 *     --pk       userId \
 *     --sk       sk \
 *     [--region  eu-west-1] \
 *     [--endpoint http://localhost:4566]
 *
 * After the import completes, run restore-sanitize.ts against the new table
 * to remove any users who deleted their account after the snapshot date.
 *
 * --endpoint is only used for local testing against LocalStack.
 */

import {
  DynamoDBClient,
  ImportTableCommand,
  DescribeImportCommand,
  ImportStatus,
  InputFormat,
  BillingMode,
  ScalarAttributeType,
  KeyType,
} from '@aws-sdk/client-dynamodb';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 180; // 30 minutes at 10s intervals

function parseArgs(): {
  bucket: string;
  prefix: string;
  table: string;
  pk: string;
  sk: string | undefined;
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

  return {
    bucket: require('--bucket'),
    prefix: require('--prefix'),
    table: require('--table'),
    pk: require('--pk'),
    sk: get('--sk'),
    region: get('--region') ?? 'eu-west-1',
    endpoint: get('--endpoint'),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const { bucket, prefix, table, pk, sk, region, endpoint } = parseArgs();

  // Ensure the prefix ends with / so DynamoDB scans the full export folder
  const s3Prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

  const client = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });

  const attributeDefinitions: { AttributeName: string; AttributeType: ScalarAttributeType }[] = [
    { AttributeName: pk, AttributeType: ScalarAttributeType.S },
  ];
  const keySchema: { AttributeName: string; KeyType: KeyType }[] = [
    { AttributeName: pk, KeyType: KeyType.HASH },
  ];
  if (sk) {
    attributeDefinitions.push({ AttributeName: sk, AttributeType: ScalarAttributeType.S });
    keySchema.push({ AttributeName: sk, KeyType: KeyType.RANGE });
  }

  console.log(`Starting import from s3://${bucket}/${s3Prefix} → ${table}`);

  const { ImportTableDescription } = await client.send(
    new ImportTableCommand({
      S3BucketSource: { S3Bucket: bucket, S3KeyPrefix: s3Prefix },
      InputFormat: InputFormat.DYNAMODB_JSON,
      TableCreationParameters: {
        TableName: table,
        AttributeDefinitions: attributeDefinitions,
        KeySchema: keySchema,
        BillingMode: BillingMode.PAY_PER_REQUEST,
      },
    }),
  );

  const importArn = ImportTableDescription?.ImportArn;
  if (!importArn) throw new Error('ImportTableCommand did not return an ImportArn');

  console.log(`Import started — ARN: ${importArn}`);
  console.log('Polling for completion…');

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const { ImportTableDescription: desc } = await client.send(
      new DescribeImportCommand({ ImportArn: importArn }),
    );
    const status = desc?.ImportStatus;

    console.log(`[${i + 1}/${MAX_POLLS}] status: ${status}`);

    if (status === ImportStatus.COMPLETED) {
      console.log(`\nImport complete. New table: ${table}`);
      console.log(
        `\nNext step — sanitize the restored table before using it:\n` +
          `  npx ts-node infra/scripts/restore-sanitize.ts \\\n` +
          `    --restored-tables ${table} \\\n` +
          `    [--endpoint ${endpoint ?? 'https://dynamodb.' + region + '.amazonaws.com'}]`,
      );
      return;
    }

    if (
      status === ImportStatus.FAILED ||
      status === ImportStatus.CANCELLING ||
      status === ImportStatus.CANCELLED
    ) {
      throw new Error(
        `Import ended with status ${status}: ${desc?.FailureMessage ?? 'no message'}`,
      );
    }
  }

  throw new Error(
    `Import timed out after ${MAX_POLLS * POLL_INTERVAL_MS}ms — check ImportArn: ${importArn}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
