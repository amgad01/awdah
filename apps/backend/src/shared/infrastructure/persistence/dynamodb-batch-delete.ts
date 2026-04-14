/**
 * Reusable batched-delete helper for DynamoDB.
 *
 * DDB's `BatchWriteItem` accepts at most 25 items per call.  This utility:
 *   1. Chunks the key list into 25-item batches.
 *   2. Fires each batch with retry + full-jitter backoff on unprocessed items.
 *   3. Is stateless and side-effect-free (no DI container) so it can be
 *      used by both runtime Lambda repositories and offline admin scripts.
 */
import {
  BatchWriteCommand,
  type BatchWriteCommandInput,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { InternalError } from '@awdah/shared';
import { getFullJitterBackoffDelayMs, wait } from './retry-backoff';

const MAX_BATCH_DELETE_ATTEMPTS = 5;
const BATCH_DELETE_RETRY_BASE_DELAY_MS = 50;

/**
 * Deletes arbitrary DynamoDB keys in batches with bounded retries.
 *
 * This helper lives outside the repository base class so operator tooling
 * such as restore/sanitize scripts can reuse the same retry behavior the
 * runtime repositories use for destructive bulk cleanup.
 */
export async function deleteKeysInBatches(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  keys: Array<Record<string, unknown>>,
): Promise<void> {
  for (let i = 0; i < keys.length; i += 25) {
    const batch = keys.slice(i, i + 25);
    let requestItems: BatchWriteCommandInput['RequestItems'] = {
      [tableName]: batch.map((key) => ({
        DeleteRequest: { Key: key },
      })),
    };

    for (let attempt = 1; hasPendingBatchWrites(requestItems); attempt += 1) {
      const result: { UnprocessedItems?: BatchWriteCommandInput['RequestItems'] } =
        await docClient.send(new BatchWriteCommand({ RequestItems: requestItems }));
      requestItems = result.UnprocessedItems;

      if (!hasPendingBatchWrites(requestItems)) break;

      if (attempt >= MAX_BATCH_DELETE_ATTEMPTS) {
        throw new InternalError(
          `Failed to delete all batch items from ${tableName} after ${MAX_BATCH_DELETE_ATTEMPTS} attempts`,
        );
      }

      await wait(getBatchDeleteRetryDelayMs(attempt));
    }
  }
}

function hasPendingBatchWrites(requestItems: BatchWriteCommandInput['RequestItems']): boolean {
  if (!requestItems) return false;
  return Object.values(requestItems).some((requests) => (requests?.length ?? 0) > 0);
}

function getBatchDeleteRetryDelayMs(attempt: number): number {
  return getFullJitterBackoffDelayMs(BATCH_DELETE_RETRY_BASE_DELAY_MS, attempt);
}
