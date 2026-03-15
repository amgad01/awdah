import {
  HijriDate,
  type Gender,
  type Madhab,
  type CalculationMethod,
  type MoonSightingPreference,
  type Location,
} from '@awdah/shared';

export interface UserProps {
  userId: string;
  bulughDate: HijriDate;
  gender: Gender;
  madhab?: Madhab;
  calculationMethod?: CalculationMethod;
  moonSightingPreference?: MoonSightingPreference;
  location?: Location;
}

export class User {
  readonly userId: string;
  private bulughDate: HijriDate;
  private gender: Gender;
  private madhab?: Madhab;
  private calculationMethod?: CalculationMethod;
  private moonSightingPreference?: MoonSightingPreference;
  private location?: Location;

  constructor(props: UserProps) {
    this.userId = props.userId;
    this.bulughDate = props.bulughDate;
    this.gender = props.gender;
    this.madhab = props.madhab;
    this.calculationMethod = props.calculationMethod;
    this.moonSightingPreference = props.moonSightingPreference;
    this.location = props.location;
  }

  getSettings() {
    return {
      userId: this.userId,
      bulughDate: this.bulughDate,
      gender: this.gender,
      madhab: this.madhab,
      calculationMethod: this.calculationMethod,
      moonSightingPreference: this.moonSightingPreference,
      location: this.location,
    };
  }

  updateSettings(props: Partial<Omit<UserProps, 'userId'>>) {
    if (props.bulughDate) this.bulughDate = props.bulughDate;
    if (props.gender) this.gender = props.gender;
    if (props.madhab) this.madhab = props.madhab;
    if (props.calculationMethod) this.calculationMethod = props.calculationMethod;
    if (props.moonSightingPreference) this.moonSightingPreference = props.moonSightingPreference;
    if (props.location) this.location = props.location;
  }
}
