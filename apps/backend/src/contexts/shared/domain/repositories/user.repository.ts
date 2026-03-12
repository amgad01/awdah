import { HijriDate } from '@awdah/shared';

export interface UserSettings {
  userId: string;
  bulughDate: HijriDate;
  gender: 'male' | 'female';
}

export interface IUserRepository {
  findById(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<void>;
}
