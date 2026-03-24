/**
 * Shared date utility functions used across worship loggers and history.
 */
import { HijriDate } from '@awdah/shared';

export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function gregorianNoon(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function todayHijriDate(): string {
  return HijriDate.today().toString();
}

export function addHijriDays(dateStr: string, n: number): string {
  return HijriDate.fromString(dateStr).addDays(n).toString();
}

export function hijriToGregorianDate(dateStr: string): Date {
  return HijriDate.fromString(dateStr).toGregorian();
}

export function hijriToGregorianIso(dateStr: string): string {
  return isoDate(hijriToGregorianDate(dateStr));
}

export function gregorianIsoToHijri(dateStr: string): string {
  return HijriDate.fromGregorian(gregorianNoon(dateStr)).toString();
}
