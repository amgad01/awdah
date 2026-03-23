export type UserDataExport = Record<string, unknown>;

export interface IUserDataLifecycleService {
  deleteUserData(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<UserDataExport>;
}
