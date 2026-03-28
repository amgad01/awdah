import { describe, it, expect } from 'vitest';
import { UmAlQuraCalendarService } from '../umalqura-calendar.service';
import { HijriDate } from '@awdah/shared';

// All expected values are verified against the Umm al-Qura calendar tables.
describe('UmAlQuraCalendarService', () => {
  const service = new UmAlQuraCalendarService();

  describe('getRamadanDays', () => {
    it('returns 30 for Ramadan 1445', () => {
      // Ramadan 1445 ended on 9 April 2024 — 30 days per Umm al-Qura.
      expect(service.getRamadanDays(1445)).toBe(30);
    });

    it('returns 29 for Ramadan 1446', () => {
      // Ramadan 1446 ended on 29 March 2025 — 29 days per Umm al-Qura.
      expect(service.getRamadanDays(1446)).toBe(29);
    });

    it('returns either 29 or 30 for any year', () => {
      for (const year of [1440, 1441, 1442, 1443, 1444, 1447]) {
        const days = service.getRamadanDays(year);
        expect([29, 30]).toContain(days);
      }
    });
  });

  describe('daysBetween', () => {
    it('returns 0 for the same date', () => {
      const d = HijriDate.fromString('1445-09-01');
      expect(service.daysBetween(d, d)).toBe(0);
    });

    it('calculates days within the same month', () => {
      const start = HijriDate.fromString('1445-09-01');
      const end = HijriDate.fromString('1445-09-10');
      expect(service.daysBetween(start, end)).toBe(9);
    });

    it('calculates days spanning a month boundary', () => {
      // Ramadan 1445 has 30 days per Umm al-Qura, so Shawwal 1 is 30 days after Ramadan 1.
      const start = HijriDate.fromString('1445-09-01');
      const end = HijriDate.fromString('1445-10-01');
      expect(service.daysBetween(start, end)).toBe(30);
    });

    it('calculates days spanning a year boundary', () => {
      const start = HijriDate.fromString('1445-12-01');
      const end = HijriDate.fromString('1446-01-01');
      // 1445-12 (Dhu al-Hijjah) — check length and confirm span
      const span = service.daysBetween(start, end);
      expect(span).toBeGreaterThanOrEqual(29);
      expect(span).toBeLessThanOrEqual(30);
    });

    it('returns a negative value when end is before start', () => {
      const start = HijriDate.fromString('1445-09-10');
      const end = HijriDate.fromString('1445-09-01');
      expect(service.daysBetween(start, end)).toBeLessThan(0);
    });
  });

  describe('today', () => {
    it('returns a valid HijriDate', () => {
      const today = service.today();
      expect(today).toBeInstanceOf(HijriDate);
      expect(today.year).toBeGreaterThan(1440);
      expect(today.month).toBeGreaterThanOrEqual(1);
      expect(today.month).toBeLessThanOrEqual(12);
      expect(today.day).toBeGreaterThanOrEqual(1);
      expect(today.day).toBeLessThanOrEqual(30);
    });

    it('matches HijriDate.today()', () => {
      // Both derive from the same clock call — we only assert they are the same day.
      const a = service.today();
      const b = HijriDate.today();
      expect(a.year).toBe(b.year);
      expect(a.month).toBe(b.month);
      expect(a.day).toBe(b.day);
    });
  });
});
