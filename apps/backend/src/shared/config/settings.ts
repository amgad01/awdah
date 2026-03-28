/**
 * Validates and retrieves environment variables.
 * Accepts either a single key (returns string) or an array of keys (returns void).
 */
function requireEnv(key: string, localFallback: string): string;
function requireEnv(keys: string[]): void;
function requireEnv(keyOrKeys: string | string[], localFallback?: string): string | void {
  const isLocal = process.env.LOCALSTACK_ENDPOINT !== undefined || process.env.NODE_ENV === 'test';

  if (Array.isArray(keyOrKeys)) {
    if (!isLocal) {
      const missing = keyOrKeys.filter((k) => !process.env[k]);
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    }
    return;
  }

  const value = process.env[keyOrKeys];
  if (!value) {
    if (isLocal) return localFallback || '';
    throw new Error(`Missing required environment variable: ${keyOrKeys}`);
  }
  return value;
}

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
    prayerLogs: requireEnv(
      'PRAYER_LOGS_TABLE',
      `Awdah-PrayerLogs-${process.env.NODE_ENV || 'dev'}`,
    ),
    fastLogs: requireEnv('FAST_LOGS_TABLE', `Awdah-FastLogs-${process.env.NODE_ENV || 'dev'}`),
    practicingPeriods: requireEnv(
      'PRACTICING_PERIODS_TABLE',
      `Awdah-PracticingPeriods-${process.env.NODE_ENV || 'dev'}`,
    ),
    userSettings: requireEnv(
      'USER_SETTINGS_TABLE',
      `Awdah-UserSettings-${process.env.NODE_ENV || 'dev'}`,
    ),
    userLifecycleJobs: requireEnv(
      'USER_LIFECYCLE_JOBS_TABLE',
      `Awdah-UserLifecycleJobs-${process.env.NODE_ENV || 'dev'}`,
    ),
    deletedUsers: requireEnv(
      'DELETED_USERS_TABLE',
      `Awdah-DeletedUsers-${process.env.NODE_ENV || 'dev'}`,
    ),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
