import { describe, it, expect } from 'vitest';
import { formatNumber, formatPercent, formatDate } from '../format';

describe('formatNumber', () => {
  it('returns plain string for English', () => {
    expect(formatNumber(1234, 'en')).toBe('1234');
  });

  it('returns Arabic-Indic digits for Arabic', () => {
    const result = formatNumber(5, 'ar');
    expect(result).toBe('٥');
  });

  it('handles zero', () => {
    expect(formatNumber(0, 'en')).toBe('0');
    expect(formatNumber(0, 'ar')).toBe('٠');
  });

  it('does not use grouping separators in Arabic', () => {
    const result = formatNumber(10000, 'ar');
    expect(result).not.toContain(',');
    expect(result).not.toContain('٬');
  });
});

describe('formatPercent', () => {
  it('formats percentage for English', () => {
    expect(formatPercent(50, 'en')).toBe('50%');
  });

  it('formats percentage for Arabic', () => {
    const result = formatPercent(50, 'ar');
    expect(result).toContain('٥٠');
    expect(result).toContain('٪');
  });

  it('handles zero percent', () => {
    expect(formatPercent(0, 'en')).toBe('0%');
  });

  it('handles 100 percent', () => {
    expect(formatPercent(100, 'en')).toBe('100%');
  });

  it('rounds to whole number', () => {
    expect(formatPercent(33.7, 'en')).toBe('34%');
  });
});

describe('formatDate', () => {
  it('formats a date string for English', () => {
    const result = formatDate('2024-03-15', 'en');
    expect(result).toContain('15');
    expect(result).toContain('Mar');
  });

  it('formats a date string for Arabic', () => {
    const result = formatDate('2024-03-15', 'ar');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
