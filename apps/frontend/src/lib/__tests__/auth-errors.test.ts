// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getAuthErrorKey } from '../auth-errors';

describe('getAuthErrorKey', () => {
  it('maps the raw Cognito credential error to the localized key', () => {
    expect(getAuthErrorKey(new Error('Incorrect username or password.'), 'auth.login_error')).toBe(
      'auth.incorrect_username_or_password',
    );
  });

  it('preserves translated auth keys', () => {
    expect(getAuthErrorKey(new Error('auth.signup_error'), 'auth.login_error')).toBe(
      'auth.signup_error',
    );
  });

  it('normalizes structured auth errors', () => {
    expect(
      getAuthErrorKey(
        { message: 'Incorrect username or password.' } as unknown,
        'auth.login_error',
      ),
    ).toBe('auth.incorrect_username_or_password');
  });

  it('falls back for unknown errors', () => {
    expect(getAuthErrorKey(new Error('Something else'), 'auth.login_error')).toBe(
      'auth.login_error',
    );
  });
});
