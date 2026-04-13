/**
 * Retry utilities with full-jitter exponential backoff.
 *
 * Why **full jitter** (`random(0, base * 2^attempt)`)?
 *   Equal-jitter and decorrelated strategies still produce correlated retry
 *   bursts when many callers hit the same throttle at the same time (e.g.
 *   a batch of DDB writes).  Full jitter spreads retries uniformly across
 *   the backoff window, which AWS recommends for DynamoDB throttle recovery.
 *
 * Reference: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export function getFullJitterBackoffDelayMs(baseDelayMs: number, attempt: number): number {
  const exponentialDelay = baseDelayMs * 2 ** (attempt - 1);
  const halfDelay = Math.floor(exponentialDelay / 2);
  return halfDelay + Math.floor(Math.random() * Math.max(halfDelay, 1));
}

export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
