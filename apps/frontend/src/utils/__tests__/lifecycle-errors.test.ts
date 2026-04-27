// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createRateLimitError,
  createNoLogsError,
  isRateLimitError,
  isNoLogsError,
  shouldSuppressToast,
  getRateLimitSecondsRemaining,
  LIFECYCLE_ERROR_PREFIXES,
} from '../lifecycle-errors';
import { ApiRequestError } from '../../lib/api';
import { ERROR_CODES } from '@awdah/shared';

// ── helpers ──────────────────────────────────────────────────────────────────

const rateErr = (ctx = 'prayers', secs = 30) => createRateLimitError(ctx, secs);
const noLogsErr = (ctx = 'prayers') => createNoLogsError(ctx);

// ── createRateLimitError ─────────────────────────────────────────────────────

describe('createRateLimitError', () => {
  it('returns an Error', () => expect(rateErr()).toBeInstanceOf(Error));

  it('message starts with RATE_LIMIT prefix', () => {
    expect(rateErr().message).toMatch(/^RATE_LIMIT:/);
  });

  it('embeds context and seconds in message', () => {
    expect(rateErr('fasts', 60).message).toBe('RATE_LIMIT:fasts:60');
  });

  it('handles zero seconds', () => {
    expect(rateErr('export', 0).message).toBe('RATE_LIMIT:export:0');
  });
});

// ── createNoLogsError ────────────────────────────────────────────────────────

describe('createNoLogsError', () => {
  it('returns an Error', () => expect(noLogsErr()).toBeInstanceOf(Error));

  it('message starts with NO_LOGS prefix', () => {
    expect(noLogsErr().message).toMatch(/^NO_LOGS:/);
  });

  it('embeds context in message', () => {
    expect(noLogsErr('fasts').message).toBe('NO_LOGS:fasts');
  });
});

// ── isRateLimitError ─────────────────────────────────────────────────────────

describe('isRateLimitError', () => {
  it.each([
    ['rate limit error', rateErr(), true],
    ['no-logs error', noLogsErr(), false],
    ['plain Error', new Error('something'), false],
    ['null', null, false],
    ['string', 'RATE_LIMIT:x:5', false],
  ])('%s → %s', (_label, input, expected) => {
    expect(isRateLimitError(input)).toBe(expected);
  });
});

// ── isNoLogsError ────────────────────────────────────────────────────────────

describe('isNoLogsError', () => {
  it.each([
    ['no-logs error', noLogsErr(), true],
    ['rate limit error', rateErr(), false],
    ['null', null, false],
  ])('%s → %s', (_label, input, expected) => {
    expect(isNoLogsError(input)).toBe(expected);
  });

  it('plain Error whose message starts with NO_LOGS: is detected', () => {
    expect(isNoLogsError(new Error('NO_LOGS:prayers'))).toBe(true);
  });
});

// ── shouldSuppressToast ──────────────────────────────────────────────────────

describe('shouldSuppressToast', () => {
  it('suppresses rate limit errors', () => expect(shouldSuppressToast(rateErr())).toBe(true));
  it('suppresses no-logs errors', () => expect(shouldSuppressToast(noLogsErr())).toBe(true));
  it('does not suppress plain errors', () =>
    expect(shouldSuppressToast(new Error('oops'))).toBe(false));
  it('does not suppress null', () => expect(shouldSuppressToast(null)).toBe(false));

  describe('NO_RECORDS suppression', () => {
    it('suppresses ApiRequestError with RESET_PRAYERS_NO_RECORDS code', () => {
      const err = new ApiRequestError('msg', 409, ERROR_CODES.RESET_PRAYERS_NO_RECORDS);
      expect(shouldSuppressToast(err)).toBe(true);
    });

    it('suppresses ApiRequestError with RESET_FASTS_NO_RECORDS code', () => {
      const err = new ApiRequestError('msg', 409, ERROR_CODES.RESET_FASTS_NO_RECORDS);
      expect(shouldSuppressToast(err)).toBe(true);
    });

    it('suppresses plain Error whose message is RESET_PRAYERS_NO_RECORDS', () => {
      expect(shouldSuppressToast(new Error(ERROR_CODES.RESET_PRAYERS_NO_RECORDS))).toBe(true);
    });

    it('suppresses plain Error whose message is RESET_FASTS_NO_RECORDS', () => {
      expect(shouldSuppressToast(new Error(ERROR_CODES.RESET_FASTS_NO_RECORDS))).toBe(true);
    });

    it('does not suppress ApiRequestError with an unrelated code', () => {
      const err = new ApiRequestError('msg', 409, ERROR_CODES.SALAH_NO_QADAA_OWED);
      expect(shouldSuppressToast(err)).toBe(false);
    });
  });
});

// ── getRateLimitSecondsRemaining ─────────────────────────────────────────────

describe('getRateLimitSecondsRemaining', () => {
  it('extracts seconds from a rate limit error', () => {
    expect(getRateLimitSecondsRemaining(rateErr('prayers', 45))).toBe(45);
  });

  it('returns 0 when seconds is 0', () => {
    expect(getRateLimitSecondsRemaining(rateErr('x', 0))).toBe(0);
  });

  it('returns null for a no-logs error', () => {
    expect(getRateLimitSecondsRemaining(noLogsErr())).toBeNull();
  });

  it('returns null for a plain Error', () => {
    expect(getRateLimitSecondsRemaining(new Error('oops'))).toBeNull();
  });

  it('returns null for null', () => {
    expect(getRateLimitSecondsRemaining(null)).toBeNull();
  });
});

// ── LIFECYCLE_ERROR_PREFIXES contract ────────────────────────────────────────

describe('LIFECYCLE_ERROR_PREFIXES', () => {
  it('exports RATE_LIMIT and NO_LOGS constants', () => {
    expect(LIFECYCLE_ERROR_PREFIXES.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(LIFECYCLE_ERROR_PREFIXES.NO_LOGS).toBe('NO_LOGS');
  });
});
