/**
 * Enum of all valid sort key values for the UserSettings DynamoDB table.
 *
 * SK layout: one fixed record per user — PK=userId, SK=SETTINGS.
 */
export enum UserSettingsSK {
  SETTINGS = 'SETTINGS',
}
