import { UserId } from '@awdah/shared';

export type UserDataExport = Record<string, unknown>;

export interface IUserDataLifecycleService {
  deleteUserData(userId: UserId): Promise<void>;
  exportUserData(userId: UserId): Promise<UserDataExport>;
  resetPrayerLogs(userId: UserId): Promise<void>;
  resetFastLogs(userId: UserId): Promise<void>;
}
