import { describe, it, expect } from 'vitest';
import {
  createProfileFormState,
  buildDebtPreview,
  getErrorMessage,
  computeHijriAge,
} from '../helpers';

describe('createProfileFormState', () => {
  it('returns defaults when profile is null', () => {
    const state = createProfileFormState('key', null);
    expect(state).toEqual({
      sourceKey: 'key',
      username: '',
      dateOfBirth: '',
      bulughDate: '',
      revertDate: '',
      gender: 'male',
    });
  });

  it('returns defaults when profile is undefined', () => {
    const state = createProfileFormState('key');
    expect(state).toEqual({
      sourceKey: 'key',
      username: '',
      dateOfBirth: '',
      bulughDate: '',
      revertDate: '',
      gender: 'male',
    });
  });

  it('populates from a profile object', () => {
    const state = createProfileFormState('p1', {
      username: 'Amgad',
      dateOfBirth: '1420-05-10',
      bulughDate: '1435-05-10',
      gender: 'female',
      revertDate: '1440-01-01',
    });
    expect(state.username).toBe('Amgad');
    expect(state.dateOfBirth).toBe('1420-05-10');
    expect(state.bulughDate).toBe('1435-05-10');
    expect(state.gender).toBe('female');
    expect(state.revertDate).toBe('1440-01-01');
    expect(state.sourceKey).toBe('p1');
  });
});

describe('buildDebtPreview', () => {
  it('returns null when current bulugh date is undefined', () => {
    expect(buildDebtPreview(undefined, '1435-01-01', [], [])).toBeNull();
  });

  it('returns null when next bulugh date is undefined', () => {
    expect(buildDebtPreview('1435-01-01', undefined, [], [])).toBeNull();
  });

  it('computes debt delta between two bulugh dates', () => {
    const result = buildDebtPreview('1435-01-01', '1436-01-01', [], []);
    expect(result).not.toBeNull();
    // Moving bulugh later means less debt
    expect(result!.delta).toBeLessThan(0);
    expect(result!.current).toBeGreaterThan(result!.next);
  });

  it('returns delta of zero when bulugh dates are the same', () => {
    const result = buildDebtPreview('1435-01-01', '1435-01-01', [], []);
    expect(result).not.toBeNull();
    expect(result!.delta).toBe(0);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(getErrorMessage(new Error('oops'), 'fallback')).toBe('oops');
  });

  it('returns fallback for non-Error values', () => {
    expect(getErrorMessage('string error', 'fallback')).toBe('fallback');
    expect(getErrorMessage(42, 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('computeHijriAge', () => {
  it('returns null for empty dob', () => {
    expect(computeHijriAge('', '1445-01-01')).toBeNull();
  });

  it('returns null for empty later date', () => {
    expect(computeHijriAge('1420-01-01', '')).toBeNull();
  });

  it('computes exact age when later date is full year after dob', () => {
    expect(computeHijriAge('1420-06-15', '1435-06-15')).toBe(15);
  });

  it('subtracts one year when month has not been reached', () => {
    expect(computeHijriAge('1420-06-15', '1435-04-10')).toBe(14);
  });

  it('subtracts one year when same month but day not reached', () => {
    expect(computeHijriAge('1420-06-15', '1435-06-10')).toBe(14);
  });

  it('computes age for revert at 25', () => {
    expect(computeHijriAge('1400-01-01', '1425-01-01')).toBe(25);
  });

  it('computes age for revert at 12 (under 15)', () => {
    expect(computeHijriAge('1430-03-10', '1442-05-10')).toBe(12);
  });

  it('returns null for invalid date strings', () => {
    expect(computeHijriAge('invalid', '1445-01-01')).toBeNull();
    expect(computeHijriAge('1420-01-01', 'bad')).toBeNull();
  });
});
