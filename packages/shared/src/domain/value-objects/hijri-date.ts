import { toHijri, toGregorian } from 'hijri-converter';
import { ValidationError } from '../../errors';
import { RAMADAN_MONTH_NUMBER, HIJRI_MONTHS_IN_YEAR } from '../../constants';
import { getHijriMonthName, type SupportedLocale } from '../../i18n';
import { type HijriDateObject } from '../../types';

export class HijriDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.validate();
  }

  private validate(): void {
    if (this.year < 1) {
      throw new ValidationError('Hijri year must be positive');
    }
    if (this.month < 1 || this.month > HIJRI_MONTHS_IN_YEAR) {
      throw new ValidationError(`Hijri month must be between 1 and ${HIJRI_MONTHS_IN_YEAR}`);
    }
    // Hijri months alternate between 29 and 30 days. No month can have more than 30.
    if (this.day < 1 || this.day > 30) {
      throw new ValidationError('Hijri day must be between 1 and 30');
    }
  }

  isRamadan(): boolean {
    return this.month === RAMADAN_MONTH_NUMBER;
  }

  isBefore(other: HijriDate | HijriDateObject): boolean {
    if (this.year !== other.year) return this.year < other.year;
    if (this.month !== other.month) return this.month < other.month;
    return this.day < other.day;
  }

  isAfter(other: HijriDate | HijriDateObject): boolean {
    if (this.year !== other.year) return this.year > other.year;
    if (this.month !== other.month) return this.month > other.month;
    return this.day > other.day;
  }

  equals(other: HijriDate | HijriDateObject): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day;
  }

  toObject(): HijriDateObject {
    return {
      year: this.year,
      month: this.month,
      day: this.day,
    };
  }

  toString(): string {
    return `${this.year}-${this.month.toString().padStart(2, '0')}-${this.day.toString().padStart(2, '0')}`;
  }

  /**
   * Called automatically by JSON.stringify. Returns the Hijri date as a YYYY-MM-DD string
   * so HijriDate instances in API responses serialize as strings, not objects.
   */
  toJSON(): string {
    return this.toString();
  }

  format(locale: SupportedLocale = 'en'): string {
    const monthName = getHijriMonthName(this.month, locale);
    if (locale === 'ar') {
      return `${this.day} ${monthName} ${this.year}`;
    }
    return `${monthName} ${this.day}, ${this.year}`;
  }

  toGregorian(): Date {
    const { gy, gm, gd } = toGregorian(this.year, this.month, this.day);
    return new Date(Date.UTC(gy, gm - 1, gd));
  }

  addDays(days: number): HijriDate {
    const gregorian = this.toGregorian();
    gregorian.setUTCDate(gregorian.getUTCDate() + days);
    return HijriDate.fromGregorian(gregorian);
  }

  static fromString(dateStr: string): HijriDate {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      throw new ValidationError(`Invalid Hijri date format: ${dateStr}. Expected YYYY-MM-DD.`);
    }
    const [y, m, d] = parts.map(Number);
    if (y === undefined || m === undefined || d === undefined || isNaN(y) || isNaN(m) || isNaN(d)) {
      throw new ValidationError(`Invalid Hijri date components: ${dateStr}`);
    }
    return new HijriDate(y, m, d);
  }

  static fromObject(obj: HijriDateObject): HijriDate {
    return new HijriDate(obj.year, obj.month, obj.day);
  }

  static fromGregorian(date: Date): HijriDate {
    // Use UTC components to avoid local timezone shifts during conversion
    const { hy, hm, hd } = toHijri(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
    return new HijriDate(hy, hm, hd);
  }

  static today(): HijriDate {
    return this.fromGregorian(new Date());
  }
}
