interface AwsClientConfigOptions {
  region?: string;
  endpoint?: string;
  maxAttempts?: number;
}

/**
 * Shared AWS SDK client config tuned for burst resilience without adding new paid services.
 * Adaptive retry mode helps spread retries when AWS starts throttling.
 */
export function createAwsClientConfig({
  region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  endpoint = process.env.LOCALSTACK_ENDPOINT,
  maxAttempts = 5,
}: AwsClientConfigOptions = {}) {
  return {
    region,
    ...(endpoint ? { endpoint } : {}),
    maxAttempts,
    retryMode: 'adaptive' as const,
  };
}
