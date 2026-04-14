import type { DynamoDBStreamEvent } from 'aws-lambda';
import { UserId, EventId } from '@awdah/shared';
import { processUserLifecycleJobUseCase } from '../../di/user-use-cases';
import { createLogger } from '../../middleware/logger';

const logger = createLogger('ProcessUserLifecycleJobHandler');

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
      continue;
    }

    const userId = getStringAttribute(record.dynamodb.NewImage.userId);
    const sk = getStringAttribute(record.dynamodb.NewImage.sk);
    const status = getStringAttribute(record.dynamodb.NewImage.status);

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
      userId: new UserId(userId),
      jobId: new EventId(sk.slice('JOB#'.length)),
    });
  }

  logger.debug({ recordCount: event.Records.length }, 'Lifecycle job stream batch processed');
}

function getStringAttribute(value?: { S?: string }): string | undefined {
  return value?.S;
}
