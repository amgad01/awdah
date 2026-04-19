/**
 * Process an array of items in batches with limited concurrency.
 * This prevents overwhelming downstream services while maximizing throughput.
 *
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent operations
 * @param processor - Async function to process each item
 * @returns Array of results (undefined for failed items)
 */
export async function processInBatches<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T, index: number) => Promise<R>,
): Promise<(R | undefined)[]> {
  if (concurrency < 1) {
    throw new Error(`concurrency must be at least 1, got ${concurrency}`);
  }

  const results: (R | undefined)[] = new Array(items.length);

  async function processBatch(startIndex: number): Promise<void> {
    const batch = items.slice(startIndex, startIndex + concurrency);
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = startIndex + batchIndex;
      try {
        results[globalIndex] = await processor(item, globalIndex);
      } catch {
        // Leave as undefined on error - caller can check
        results[globalIndex] = undefined;
      }
    });
    await Promise.all(batchPromises);

    const nextIndex = startIndex + concurrency;
    if (nextIndex < items.length) {
      await processBatch(nextIndex);
    }
  }

  await processBatch(0);
  return results;
}

/**
 * Process records from DynamoDB Streams with error isolation.
 * Each record is processed independently - one failure doesn't stop others.
 */
export async function processStreamRecords<T, R>(
  records: T[],
  concurrency: number,
  processor: (record: T) => Promise<R | null>,
  logger: { error: (msg: string, meta?: Record<string, unknown>) => void },
): Promise<{ succeeded: R[]; failed: number }> {
  const succeeded: R[] = [];
  let failed = 0;

  await processInBatches(records, concurrency, async (record, index) => {
    try {
      const result = await processor(record);
      if (result !== null) {
        succeeded.push(result);
      }
      return result;
    } catch (error) {
      failed++;
      logger.error('Stream record processing failed', {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  });

  return { succeeded, failed };
}
