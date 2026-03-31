import { describe, expect, it } from 'vitest';
import {
  getAgeBasedBulughDate,
  getCurrentHijriAge,
  getDefaultBulughDate,
} from '../profile-date-utils';

describe('profile-date-utils', () => {
  it('returns a default bulugh date when it is not in the future', () => {
    expect(getDefaultBulughDate('1430-01-01')).toBe('1445-01-01');
  });

  it('returns null when the default bulugh date would be in the future', () => {
    expect(getDefaultBulughDate('1445-12-01')).toBeNull();
  });

  it('can return a future default bulugh date when explicitly allowed', () => {
    expect(getDefaultBulughDate('1445-12-01', { allowFuture: true })).toBe('1460-12-01');
  });

  it('returns null when an age-based bulugh date would be in the future', () => {
    expect(getAgeBasedBulughDate('1445-12-01', '15')).toBeNull();
  });

  it('can return a future age-based bulugh date when explicitly allowed', () => {
    expect(getAgeBasedBulughDate('1445-12-01', '15', { allowFuture: true })).toBe('1460-12-01');
  });

  it('computes the current Hijri age from today', () => {
    expect(getCurrentHijriAge('1445-01-01')).toBeTypeOf('number');
  });
});
