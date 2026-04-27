import { describe, it, expect } from 'vitest';
import { validateCanLogSalahQadaa, validateCanLogFast } from '../debt-validation';
import { ConflictError, ERROR_CODES } from '../../errors';

describe('validateCanLogSalahQadaa', () => {
  it('throws ConflictError with SALAH_NO_QADAA_OWED when remaining is zero', () => {
    expect(() => validateCanLogSalahQadaa(0)).toThrow(ConflictError);
    expect(() => validateCanLogSalahQadaa(0)).toThrow(ERROR_CODES.SALAH_NO_QADAA_OWED);
  });

  it('throws ConflictError with SALAH_NO_QADAA_OWED when remaining is negative', () => {
    expect(() => validateCanLogSalahQadaa(-1)).toThrow(ConflictError);
    expect(() => validateCanLogSalahQadaa(-1)).toThrow(ERROR_CODES.SALAH_NO_QADAA_OWED);
  });

  it('does not throw when remaining is positive', () => {
    expect(() => validateCanLogSalahQadaa(1)).not.toThrow();
    expect(() => validateCanLogSalahQadaa(100)).not.toThrow();
  });
});

describe('validateCanLogFast', () => {
  it('throws ConflictError with SAWM_NO_QADAA_DEBT code when debt is zero', () => {
    expect(() => validateCanLogFast(0, 0)).toThrow(ConflictError);
    expect(() => validateCanLogFast(0, 0)).toThrow(ERROR_CODES.SAWM_NO_QADAA_DEBT);
  });

  it('throws ConflictError with SAWM_EXCEED_QADAA_DEBT code when existing logs equal debt', () => {
    expect(() => validateCanLogFast(10, 10)).toThrow(ConflictError);
    expect(() => validateCanLogFast(10, 10)).toThrow(ERROR_CODES.SAWM_EXCEED_QADAA_DEBT);
  });

  it('throws ConflictError with SAWM_EXCEED_QADAA_DEBT code when existing logs exceed debt', () => {
    expect(() => validateCanLogFast(5, 10)).toThrow(ConflictError);
    expect(() => validateCanLogFast(5, 10)).toThrow(ERROR_CODES.SAWM_EXCEED_QADAA_DEBT);
  });

  it('does not throw when existing logs are less than debt', () => {
    expect(() => validateCanLogFast(10, 5)).not.toThrow();
    expect(() => validateCanLogFast(10, 0)).not.toThrow();
  });

  it('does not throw when there is debt and no logs', () => {
    expect(() => validateCanLogFast(100, 0)).not.toThrow();
    expect(() => validateCanLogFast(30, 0)).not.toThrow();
  });
});
