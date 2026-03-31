import { describe, expect, it } from 'vitest';
import { getAgeBasedBulughDate, getDefaultBulughDate } from '../profile-date-utils';

describe('profile-date-utils', () => {
  it('returns a default bulugh date when it is not in the future', () => {
    expect(getDefaultBulughDate('1430-01-01')).toBe('1445-01-01');
  });

  it('returns null when the default bulugh date would be in the future', () => {
    expect(getDefaultBulughDate('1445-12-01')).toBeNull();
  });

  it('returns null when an age-based bulugh date would be in the future', () => {
    expect(getAgeBasedBulughDate('1445-12-01', '15')).toBeNull();
  });
});
