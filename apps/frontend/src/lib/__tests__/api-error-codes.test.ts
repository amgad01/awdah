import { describe, it, expect } from 'vitest';
import { resolveApiErrorKey, hasErrorCode } from '../api-error-codes';
import { ApiRequestError } from '../api';
import { ERROR_CODES } from '@awdah/shared';

describe('resolveApiErrorKey', () => {
  it('maps a known ApiRequestError code to its i18n key', () => {
    const err = new ApiRequestError('conflict', 409, ERROR_CODES.SALAH_NO_QADAA_OWED);
    expect(resolveApiErrorKey(err, 'common.error')).toBe('salah.error_no_qadaa_owed');
  });

  it('maps every registered error code', () => {
    const cases: [string, string][] = [
      [ERROR_CODES.SAWM_NO_QADAA_DEBT, 'sawm.error_no_qadaa_debt'],
      [ERROR_CODES.SAWM_EXCEED_QADAA_DEBT, 'sawm.error_exceed_qadaa_debt'],
      [ERROR_CODES.RESET_PRAYERS_NO_RECORDS, 'settings.reset_prayers_no_records'],
      [ERROR_CODES.RESET_PRAYERS_RATE_LIMITED, 'settings.reset_prayers_rate_limited'],
      [ERROR_CODES.RESET_FASTS_NO_RECORDS, 'settings.reset_fasts_no_records'],
      [ERROR_CODES.RESET_FASTS_RATE_LIMITED, 'settings.reset_fasts_rate_limited'],
      [ERROR_CODES.EXPORT_RATE_LIMITED, 'settings.export_rate_limited'],
      [ERROR_CODES.TASK_NOT_FOUND, 'common.task_not_found'],
      [ERROR_CODES.TASK_FAILED, 'common.task_failed'],
      [ERROR_CODES.TASK_TIMEOUT, 'common.task_timeout'],
    ];
    for (const [code, expectedKey] of cases) {
      const err = new ApiRequestError('msg', 400, code);
      expect(resolveApiErrorKey(err, 'fallback')).toBe(expectedKey);
    }
  });

  it('falls back when ApiRequestError has an unknown code', () => {
    const err = new ApiRequestError('msg', 400, 'UNKNOWN_CODE');
    expect(resolveApiErrorKey(err, 'common.error')).toBe('common.error');
  });

  it('falls back when ApiRequestError has no code', () => {
    const err = new ApiRequestError('msg', 500);
    expect(resolveApiErrorKey(err, 'common.error')).toBe('common.error');
  });

  it('resolves a plain Error whose message is a known semantic code', () => {
    const err = new Error(ERROR_CODES.TASK_FAILED);
    expect(resolveApiErrorKey(err, 'common.error')).toBe('common.task_failed');
  });

  it('falls back for a plain Error with an unknown message', () => {
    const err = new Error('something went wrong');
    expect(resolveApiErrorKey(err, 'common.error')).toBe('common.error');
  });

  it('falls back for non-Error values', () => {
    expect(resolveApiErrorKey(null, 'common.error')).toBe('common.error');
    expect(resolveApiErrorKey(undefined, 'common.error')).toBe('common.error');
    expect(resolveApiErrorKey('string error', 'common.error')).toBe('common.error');
    expect(resolveApiErrorKey(42, 'common.error')).toBe('common.error');
  });
});

describe('hasErrorCode', () => {
  it('returns true when the ApiRequestError carries the given code', () => {
    const err = new ApiRequestError('msg', 409, ERROR_CODES.SALAH_NO_QADAA_OWED);
    expect(hasErrorCode(err, ERROR_CODES.SALAH_NO_QADAA_OWED)).toBe(true);
  });

  it('returns false when the code does not match', () => {
    const err = new ApiRequestError('msg', 409, ERROR_CODES.SALAH_NO_QADAA_OWED);
    expect(hasErrorCode(err, ERROR_CODES.SAWM_NO_QADAA_DEBT)).toBe(false);
  });

  it('returns false for a plain Error', () => {
    expect(hasErrorCode(new Error('SALAH_NO_QADAA_OWED'), ERROR_CODES.SALAH_NO_QADAA_OWED)).toBe(
      false,
    );
  });

  it('returns false for non-Error values', () => {
    expect(hasErrorCode(null, ERROR_CODES.TASK_FAILED)).toBe(false);
    expect(hasErrorCode(undefined, ERROR_CODES.TASK_FAILED)).toBe(false);
  });
});
