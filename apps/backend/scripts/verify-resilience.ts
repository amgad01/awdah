/* eslint-disable no-console */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

function createChaosMiddleware(maxFailures: number) {
  let failures = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (next: any) => async (args: any) => {
    if (failures < maxFailures) {
      failures++;
      const error = new Error('ProvisionedThroughputExceededException');
      Object.assign(error, {
        name: 'ProvisionedThroughputExceededException',
        $metadata: { httpStatusCode: 400 },
      });
      throw error;
    }
    return next(args);
  };
}

async function verifyResilience() {
  console.log('--- Starting Empirical Resilience Proof ---');

  const rawClient = new DynamoDBClient({
    region: 'eu-west-1',
    endpoint: 'http://localhost:4566',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    maxAttempts: 5,
  });

  const docClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  const maxFailures = 3;
  rawClient.middlewareStack.add(createChaosMiddleware(maxFailures), {
    step: 'deserialize',
    priority: 'high',
    name: 'chaosInjection',
  });

  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Sending request (will fail ${maxFailures} times)...`);

  try {
    await docClient.send(
      new PutCommand({
        TableName: 'Awdah-PrayerLogs-development',
        Item: { userId: 'chaos-test', sk: 'resilience-proof', data: 'test' },
      }),
    );

    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Request SUCCEEDED after ${maxFailures} retries.`);
    console.log(`Total duration: ${duration}ms`);

    if (duration > 1000) {
      console.log('✅ PROOF: Exponential backoff verified (duration > 1s for 3 retries).');
    } else {
      console.log('❌ FAILED: Retries happened too fast.');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

verifyResilience().catch(console.error);
