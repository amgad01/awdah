import { ValidationError } from '@awdah/shared';
import { PRAYER_NAMES, PrayerName as PrayerNameType } from '@awdah/shared';

export class PrayerName {
  private readonly value: PrayerNameType;

  constructor(value: string) {
    if (!PRAYER_NAMES.includes(value as PrayerNameType)) {
      throw new ValidationError(`Invalid prayer name: ${value}`);
    }
    this.value = value as PrayerNameType;
  }

  getValue(): PrayerNameType {
    return this.value;
  }

  equals(other: PrayerName): boolean {
    return this.value === other.value;
  }
}
