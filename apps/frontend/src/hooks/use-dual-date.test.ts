// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatDualDateParts } from './use-dual-date';

const deps = {
  language: 'en',
  locale: 'en-GB',
  t: (key: string) => key,
  fmtNumber: (n: number) => String(n),
};

describe('formatDualDateParts', () => {
  it('returns a placeholder for an empty date', () => {
    expect(formatDualDateParts('', {}, deps)).toEqual({
      hijri: '—',
      gregorian: '—',
      primary: '—',
      secondary: '—',
    });
  });

  it('returns a placeholder for an invalid date', () => {
    expect(formatDualDateParts('not-a-date', {}, deps)).toEqual({
      hijri: '—',
      gregorian: '—',
      primary: '—',
      secondary: '—',
    });
  });

  it('formats a valid date with the Gregorian year by default', () => {
    const formatted = formatDualDateParts('1445-09-01', {}, deps);

    expect(formatted.gregorian).toContain('2024');
    expect(formatted.primary).toContain('2024');
  });
});
