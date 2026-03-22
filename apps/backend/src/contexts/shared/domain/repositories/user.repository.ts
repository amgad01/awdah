import {
  HijriDate,
  type Gender,
  type Madhab,
  type CalculationMethod,
  type MoonSightingPreference,
  type Location,
} from '@awdah/shared';

export interface UserSettings {
  userId: string;
  dateOfBirth?: HijriDate;
  bulughDate: HijriDate;
  gender: Gender;
  madhab?: Madhab;
  calculationMethod?: CalculationMethod;
  moonSightingPreference?: MoonSightingPreference;
  location?: Location;
}

export interface IUserRepository {
  findById(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
  /**
   * Retrieves all historical entries for a user across all tables.
   */
  exportData(userId: string): Promise<Record<string, unknown>>;
}
