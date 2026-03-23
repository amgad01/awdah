import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAwsClientConfig } from '../client-config';

describe('createAwsClientConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
  });

  it('defaults to adaptive retries with no endpoint when LocalStack is absent', () => {
    delete process.env.LOCALSTACK_ENDPOINT;
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;

    expect(createAwsClientConfig()).toEqual({
      region: 'us-east-1',
      maxAttempts: 5,
      retryMode: 'adaptive',
    });
  });

  it('uses explicit region and LocalStack endpoint when provided', () => {
    process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';

    expect(createAwsClientConfig({ region: 'eu-west-1', maxAttempts: 7 })).toEqual({
      region: 'eu-west-1',
      endpoint: 'http://localhost:4566',
      maxAttempts: 7,
      retryMode: 'adaptive',
    });
  });
});
