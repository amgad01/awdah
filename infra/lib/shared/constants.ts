/**
 * Infrastructure Context Identifiers
 */
export const CONTEXT = {
  SALAH: 'salah',
  SAWM: 'sawm',
  USER: 'user',
  SHARED: 'shared',
} as const;

/**
 * API Route Path Segments
 */
export const PATH = {
  LOG: '/log',
  LOGS: '/logs',
  DEBT: '/debt',
  HISTORY: '/history',
  HISTORY_PAGE: '/history/page',
  PERIOD: '/practicing-period',
  PERIODS: '/practicing-periods',
  PROFILE: '/profile',
  ACCOUNT: '/account',
  ACCOUNT_AUTH: '/account/auth',
  EXPORT: '/export',
  STATUS: '/jobs/status',
} as const;

/**
 * DynamoDB Attribute Names
 */
export const ATTR = {
  USER_ID: 'userId',
  SK: 'sk',
  TYPE_DATE: 'typeDate',
  PERIOD_ID: 'periodId',
  DELETED_AT: 'deletedAt',
  EXPIRES_AT: 'expiresAt',
} as const;

/**
 * DynamoDB Index Names
 */
export const INDEX = {
  TYPE_DATE: 'typeDateIndex',
} as const;
