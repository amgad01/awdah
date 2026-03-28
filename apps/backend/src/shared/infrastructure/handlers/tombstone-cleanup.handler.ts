import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createLogger } from '../../middleware/logger';
import { createAwsClientConfig } from '../aws/client-config';
import { DynamoDBDeletedUsersRepository } from '../persistence/dynamodb-deleted-users.repository';

// Tombstone entries older than this are safe to prune.
// S3 exports transition to Glacier after 90 days — any restore from
// Glacier is a manual operation with its own sanitization step.
const RETENTION_DAYS = 90;

export async function handler(): Promise<void> {
  const logger = createLogger('TombstoneCleanup');

  const rawClient = new DynamoDBClient(createAwsClientConfig());
  const docClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const repo = new DynamoDBDeletedUsersRepository(docClient);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffIso = cutoff.toISOString();

  logger.info({ cutoffIso, retentionDays: RETENTION_DAYS }, 'Starting tombstone cleanup');

  const pruned = await repo.deleteOlderThan(cutoffIso);

  logger.info({ pruned, cutoffIso }, 'Tombstone cleanup complete');
}
