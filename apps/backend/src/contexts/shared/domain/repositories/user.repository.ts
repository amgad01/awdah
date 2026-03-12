import { HijriDate, Gender } from '@awdah/shared';

export interface UserSettings {
  userId: string;
  bulughDate: HijriDate;
  gender: Gender;
}

export interface IUserRepository {
  findById(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<void>;
}
