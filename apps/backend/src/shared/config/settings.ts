export const settings = {
  env: process.env.NODE_ENV || 'dev',
  region: process.env.AWS_REGION || 'us-east-1',
  tables: {
    prayerLogs:
      process.env.PRAYER_LOGS_TABLE || `Awdah-PrayerLogs-${process.env.NODE_ENV || 'dev'}`,
    fastLogs: process.env.FAST_LOGS_TABLE || `Awdah-FastLogs-${process.env.NODE_ENV || 'dev'}`,
    practicingPeriods:
      process.env.PRACTICING_PERIODS_TABLE ||
      `Awdah-PracticingPeriods-${process.env.NODE_ENV || 'dev'}`,
    userSettings:
      process.env.USER_SETTINGS_TABLE || `Awdah-UserSettings-${process.env.NODE_ENV || 'dev'}`,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
