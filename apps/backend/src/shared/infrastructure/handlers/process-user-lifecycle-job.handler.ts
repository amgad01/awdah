import type { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { processUserLifecycleJobUseCase } from '../../di/container';
import { createLogger } from '../../middleware/logger';

const logger = createLogger('ProcessUserLifecycleJobHandler');

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
      continue;
    }

    const item = unmarshall(record.dynamodb.NewImage) as Record<string, unknown>;
    const userId = item.userId;
    const sk = item.sk;
    const status = item.status;

    if (
      typeof userId !== 'string' ||
      typeof sk !== 'string' ||
      typeof status !== 'string' ||
      !sk.startsWith('JOB#') ||
      sk.includes('#CHUNK#') ||
      status !== 'pending'
    ) {
      continue;
    }

    await processUserLifecycleJobUseCase.execute({
      userId,
      jobId: sk.slice('JOB#'.length),
    });
  }

  logger.debug({ recordCount: event.Records.length }, 'Lifecycle job stream batch processed');
}
