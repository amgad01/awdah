import { createLogger } from '../middleware/logger';

/**
 * Validates and retrieves environment variables.
 * Accepts either a single key (returns string) or an array of keys (returns void).
 */
const logger = createLogger('Settings');
function requireEnv(key: string, localFallback: string): string;
function requireEnv(keys: string[]): void;
function requireEnv(keyOrKeys: string | string[], localFallback?: string): string | void {
  const isLocal = process.env.LOCALSTACK_ENDPOINT !== undefined || process.env.NODE_ENV === 'test';

  if (Array.isArray(keyOrKeys)) {
    if (!isLocal) {
      const missing = keyOrKeys.filter((k) => !process.env[k]);
      if (missing.length > 0) {
        // Warning instead of throw to allow partial environment loads
        logger.warn({ missing }, 'Missing environment variables');
      }
    }
    return;
  }

  const value = process.env[keyOrKeys];
  if (!value) {
    if (isLocal || localFallback) {
      if (!isLocal) {
        logger.debug(
          { key: keyOrKeys, fallback: localFallback },
          'Missing environment variable; using fallback',
        );
      }
      return localFallback || '';
    }
    throw new Error(`Missing required environment variable: ${keyOrKeys}`);
  }
  return value;
}

function getLocalFallbackEnvName(): string {
  const explicitEnv = process.env.DEPLOY_ENV || process.env.APP_ENV;
  if (explicitEnv) {
    return explicitEnv;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'dev';
  }

  return process.env.NODE_ENV || 'dev';
}

const localFallbackEnv = getLocalFallbackEnvName();

// Validate all required env vars at module load. In prod/staging this
// runs at Lambda cold start and reports every missing variable in one error.
// Validate essential env vars at module load if we're not running a background cleanup task.
// This allows background scripts/Lambdas to load only the subset they actually need.
if (!process.env.SKIP_ENV_VALIDATION) {
  requireEnv([
    'PRAYER_LOGS_TABLE',
    'FAST_LOGS_TABLE',
    'PRACTICING_PERIODS_TABLE',
    'USER_SETTINGS_TABLE',
    'USER_LIFECYCLE_JOBS_TABLE',
    'COGNITO_USER_POOL_ID',
  ]);
}

export const settings = {
  env: process.env.NODE_ENV || 'dev',
  region: process.env.AWS_REGION || 'us-east-1',
  cognitoUserPoolId: requireEnv('COGNITO_USER_POOL_ID', 'us-east-1_localdev'),
  tables: {
    prayerLogs: requireEnv('PRAYER_LOGS_TABLE', `Awdah-PrayerLogs-${localFallbackEnv}`),
    fastLogs: requireEnv('FAST_LOGS_TABLE', `Awdah-FastLogs-${localFallbackEnv}`),
    practicingPeriods: requireEnv(
      'PRACTICING_PERIODS_TABLE',
      `Awdah-PracticingPeriods-${localFallbackEnv}`,
    ),
    userSettings: requireEnv('USER_SETTINGS_TABLE', `Awdah-UserSettings-${localFallbackEnv}`),
    userLifecycleJobs: requireEnv(
      'USER_LIFECYCLE_JOBS_TABLE',
      `Awdah-UserLifecycleJobs-${localFallbackEnv}`,
    ),
    deletedUsers: requireEnv('DELETED_USERS_TABLE', `Awdah-DeletedUsers-${localFallbackEnv}`),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
