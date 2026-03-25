import { describe, it, expect } from 'vitest';
import { createProfileFormState, buildDebtPreview, getErrorMessage } from '../helpers';

describe('createProfileFormState', () => {
  it('returns defaults when profile is null', () => {
    const state = createProfileFormState('key', null);
    expect(state).toEqual({
      sourceKey: 'key',
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
      dateOfBirth: '',
      bulughDate: '',
      revertDate: '',
      gender: 'male',
    });
  });

  it('populates from a profile object', () => {
    const state = createProfileFormState('p1', {
      dateOfBirth: '1420-05-10',
      bulughDate: '1435-05-10',
      gender: 'female',
      revertDate: '1440-01-01',
    });
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
