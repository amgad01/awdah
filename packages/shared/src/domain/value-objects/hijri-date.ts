import { ValidationError } from '../../errors';
import {
  HI_MONTH_NAMES_EN,
  HI_MONTH_NAMES_AR,
  RAMADAN_MONTH_NUMBER,
  HIJRI_MONTHS_IN_YEAR,
} from '../../constants';
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

  format(locale: 'en' | 'ar' = 'en'): string {
    const names = locale === 'ar' ? HI_MONTH_NAMES_AR : HI_MONTH_NAMES_EN;
    const monthName = names[this.month - 1];
    if (locale === 'ar') {
      return `${this.day} ${monthName} ${this.year}`;
    }
    return `${monthName} ${this.day}, ${this.year}`;
  }

  addDays(days: number): HijriDate {
    // Simplified Hijri calendar math (assuming 30 days per month for simplicity in v1)
    // Accurate Hijri arithmetic requires complex astronomical algorithms or lookups.
    // For MVP/v1, we use 30-day approximation if acceptable,
    // but better to implement a basic one.
    let d = this.day + days;
    let m = this.month;
    let y = this.year;

    while (d > 30) {
      d -= 30;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    while (d < 1) {
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
      d += 30;
    }

    return new HijriDate(y, m, d);
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
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-uma', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(date);

    const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1445') || 1445;
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1') || 1;
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1') || 1;

    return new HijriDate(year, month, day);
  }

  static today(): HijriDate {
    return this.fromGregorian(new Date());
  }
}
