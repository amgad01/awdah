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
  username?: string;
  dateOfBirth?: HijriDate;
  bulughDate: HijriDate;
  revertDate?: HijriDate;
  gender: Gender;
  madhab?: Madhab;
  calculationMethod?: CalculationMethod;
  moonSightingPreference?: MoonSightingPreference;
  location?: Location;
}

export interface IUserRepository {
  findById(userId: string): Promise<UserSettings | null>;
  save(settings: UserSettings): Promise<void>;
}
