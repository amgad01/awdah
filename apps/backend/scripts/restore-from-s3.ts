/* eslint-disable no-console */
/**
 * restore-from-s3.ts
 *
 * Restores a DynamoDB table from an S3 export snapshot using the native
 * DynamoDB ImportTable API. It always creates a brand-new table so restore
 * remains separate from any later cutover decision.
 */

import {
  BillingMode,
  DescribeImportCommand,
  DynamoDBClient,
  ImportStatus,
  ImportTableCommand,
  InputFormat,
  KeyType,
  ScalarAttributeType,
} from '@aws-sdk/client-dynamodb';
import { createAwsClientConfig } from '../src/shared/infrastructure/aws/client-config';
import {
  getFullJitterBackoffDelayMs,
  wait,
} from '../src/shared/infrastructure/persistence/retry-backoff';
import { getArgValue, requireArgValue } from './cli-args';

const POLL_BASE_DELAY_MS = 10_000;
const POLL_MAX_DELAY_MS = 120_000;
const MAX_POLLS = 180;

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

  return {
    bucket: requireArgValue(args, '--bucket'),
    prefix: requireArgValue(args, '--prefix'),
    table: requireArgValue(args, '--table'),
    pk: requireArgValue(args, '--pk'),
    sk: getArgValue(args, '--sk'),
    region: getArgValue(args, '--region') ?? 'eu-west-1',
    endpoint: getArgValue(args, '--endpoint'),
  };
}

async function main(): Promise<void> {
  const { bucket, prefix, table, pk, sk, region, endpoint } = parseArgs();
  const s3Prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

  const client = new DynamoDBClient(
    createAwsClientConfig({
      region,
      endpoint,
    }),
  );

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

  console.log(`Starting import from s3://${bucket}/${s3Prefix} -> ${table}`);

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

  console.log(`Import started - ARN: ${importArn}`);
  console.log('Polling for completion...');

  for (let i = 0; i < MAX_POLLS; i += 1) {
    const { ImportTableDescription: description } = await client.send(
      new DescribeImportCommand({ ImportArn: importArn }),
    );
    const status = description?.ImportStatus;

    console.log(`[${i + 1}/${MAX_POLLS}] status: ${status}`);

    if (status === ImportStatus.COMPLETED) {
      console.log(`\nImport complete. New table: ${table}`);
      console.log(
        `\nNext step - sanitize the restored table before using it:\n` +
          `  npx ts-node -P apps/backend/tsconfig.scripts.json apps/backend/scripts/restore-sanitize.ts \\\n` +
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
        `Import ended with status ${status}: ${description?.FailureMessage ?? 'no message'}`,
      );
    }

    if (i === MAX_POLLS - 1) {
      break;
    }

    const delayMs = Math.min(
      POLL_MAX_DELAY_MS,
      getFullJitterBackoffDelayMs(POLL_BASE_DELAY_MS, i + 1),
    );
    console.log(`Waiting ${Math.round(delayMs / 1000)}s before the next status check...`);
    await wait(delayMs);
  }

  throw new Error(
    `Import timed out after ${MAX_POLLS} status checks - check ImportArn: ${importArn}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
