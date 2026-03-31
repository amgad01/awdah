import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('settings local fallbacks', () => {
  afterEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('maps NODE_ENV=development to dev table fallbacks when running locally', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      LOCALSTACK_ENDPOINT: 'http://localhost:4566',
    };

    const { settings } = await import('../settings');

    expect(settings.tables.userLifecycleJobs).toBe('Awdah-UserLifecycleJobs-dev');
    expect(settings.tables.deletedUsers).toBe('Awdah-DeletedUsers-dev');
  });

  it('prefers DEPLOY_ENV when provided for local fallbacks', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      DEPLOY_ENV: 'staging',
      LOCALSTACK_ENDPOINT: 'http://localhost:4566',
    };

    const { settings } = await import('../settings');

    expect(settings.tables.userLifecycleJobs).toBe('Awdah-UserLifecycleJobs-staging');
    expect(settings.tables.deletedUsers).toBe('Awdah-DeletedUsers-staging');
  });
});
