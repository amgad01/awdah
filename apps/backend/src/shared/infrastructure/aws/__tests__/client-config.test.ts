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

    const config = createAwsClientConfig();
    expect(config).toMatchObject({
      region: 'us-east-1',
      maxAttempts: 5,
      retryMode: 'adaptive',
    });
    // Should have requestHandler with keep-alive
    expect(config.requestHandler).toBeDefined();
  });

  it('uses explicit region and LocalStack endpoint when provided', () => {
    process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';

    const config = createAwsClientConfig({ region: 'eu-west-1', maxAttempts: 7 });
    expect(config).toMatchObject({
      region: 'eu-west-1',
      endpoint: 'http://localhost:4566',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      maxAttempts: 7,
      retryMode: 'adaptive',
    });
    // Should have requestHandler with keep-alive
    expect(config.requestHandler).toBeDefined();
  });

  it('prefers explicit LocalStack credentials from the environment', () => {
    process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
    process.env.AWS_ACCESS_KEY_ID = 'local-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'local-secret-key';

    const config = createAwsClientConfig({ endpoint: 'http://localhost:4566' });
    expect(config).toMatchObject({
      region: 'us-east-1',
      endpoint: 'http://localhost:4566',
      credentials: {
        accessKeyId: 'local-access-key',
        secretAccessKey: 'local-secret-key',
      },
      maxAttempts: 5,
      retryMode: 'adaptive',
    });
    // Should have requestHandler with keep-alive
    expect(config.requestHandler).toBeDefined();
  });
});
