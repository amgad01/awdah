import { describe, it, expect } from 'vitest';
import { HijriDate } from '@awdah/shared';

describe('HijriDate', () => {
  it('identifies if a date is before another', () => {
    const d1 = new HijriDate(1445, 1, 1);
    const d2 = new HijriDate(1445, 1, 2);
    const d3 = new HijriDate(1446, 1, 1);

    expect(d1.isBefore(d2)).toBe(true);
    expect(d1.isBefore(d3)).toBe(true);
    expect(d2.isBefore(d1)).toBe(false);
  });

  it('validates year is positive', () => {
    expect(() => new HijriDate(0, 1, 1)).toThrow('Hijri year must be positive');
  });

  it('validates month range', () => {
    expect(() => new HijriDate(1445, 0, 1)).toThrow('Hijri month must be between 1 and 12');
    expect(() => new HijriDate(1445, 13, 1)).toThrow('Hijri month must be between 1 and 12');
  });

  it('validates day range', () => {
    expect(() => new HijriDate(1445, 1, 0)).toThrow('Hijri day must be between 1 and 30');
    expect(() => new HijriDate(1445, 1, 31)).toThrow('Hijri day must be between 1 and 30');
  });

  it('converts to/from string correctly', () => {
    const d = new HijriDate(1445, 5, 25);
    const s = d.toString();
    expect(s).toBe('1445-05-25');

    const d2 = HijriDate.fromString(s);
    expect(d2.equals(d)).toBe(true);
  });
});
