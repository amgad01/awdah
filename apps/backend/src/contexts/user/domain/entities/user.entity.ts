import { HijriDate, type Gender } from '@awdah/shared';

export interface UserProps {
  userId: string;
  bulughDate: HijriDate;
  gender: Gender;
}

export class User {
  readonly userId: string;
  private bulughDate: HijriDate;
  private gender: Gender;

  constructor(props: UserProps) {
    this.userId = props.userId;
    this.bulughDate = props.bulughDate;
    this.gender = props.gender;
  }

  getSettings() {
    return {
      userId: this.userId,
      bulughDate: this.bulughDate,
      gender: this.gender,
    };
  }

  updateSettings(props: Partial<Omit<UserProps, 'userId'>>) {
    if (props.bulughDate) this.bulughDate = props.bulughDate;
    if (props.gender) this.gender = props.gender;
  }
}
