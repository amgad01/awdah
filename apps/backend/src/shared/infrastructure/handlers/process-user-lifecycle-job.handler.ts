import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { UserId, EventId } from '@awdah/shared';
import { getProcessUserLifecycleJobUseCase } from '../../di/user-use-cases';
import { createLogger } from '../../middleware/logger';
import { processStreamRecords } from '../utils/concurrency';

const logger = createLogger('ProcessUserLifecycleJobHandler');

// Process up to 5 lifecycle jobs concurrently within a single batch
// This maximizes throughput without overwhelming DynamoDB connections
const BATCH_CONCURRENCY = 5;

interface LifecycleJob {
  userId: UserId;
  jobId: EventId;
}

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  const eligibleRecords = event.Records.filter(isEligibleJob);

  if (eligibleRecords.length === 0) {
    logger.debug({ recordCount: event.Records.length }, 'No eligible lifecycle jobs in batch');
    return;
  }

  const { succeeded, failed } = await processStreamRecords(
    eligibleRecords,
    BATCH_CONCURRENCY,
    processJobRecord,
    logger,
  );

  logger.info(
    {
      totalRecords: event.Records.length,
      eligibleJobs: eligibleRecords.length,
      succeeded: succeeded.length,
      failed,
    },
    'Lifecycle job stream batch processed',
  );

  // Throw if any jobs failed to trigger DLQ retry
  if (failed > 0) {
    throw new Error(`${failed} lifecycle job(s) failed to process`);
  }
}

function isEligibleJob(record: DynamoDBRecord): boolean {
  if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
    return false;
  }

  const userId = getStringAttribute(record.dynamodb.NewImage.userId);
  const sk = getStringAttribute(record.dynamodb.NewImage.sk);
  const status = getStringAttribute(record.dynamodb.NewImage.status);

  return (
    typeof userId === 'string' &&
    typeof sk === 'string' &&
    typeof status === 'string' &&
    sk.startsWith('JOB#') &&
    !sk.includes('#CHUNK#') &&
    status === 'pending'
  );
}

async function processJobRecord(record: DynamoDBRecord): Promise<LifecycleJob | null> {
  const userId = getStringAttribute(record.dynamodb!.NewImage!.userId);
  const sk = getStringAttribute(record.dynamodb!.NewImage!.sk);

  if (!userId || !sk) {
    return null;
  }

  const job: LifecycleJob = {
    userId: new UserId(userId),
    jobId: new EventId(sk.slice('JOB#'.length)),
  };

  await getProcessUserLifecycleJobUseCase().execute(job);
  return job;
}

function getStringAttribute(value?: { S?: string }): string | undefined {
  return value?.S;
}
