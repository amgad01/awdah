import { describe, expect, it } from 'vitest';
import { getUserDisplayInitial, getUserDisplayName } from '../user-display';

describe('user-display', () => {
  it('prefers the saved profile username', () => {
    expect(
      getUserDisplayName({
        profileUsername: 'Amgad',
        email: 'amgad@example.com',
        sessionUsername: '6245a4b4-5081-70c1-11ad-a50bb8fc211d',
        fallback: 'User',
      }),
    ).toBe('Amgad');
  });

  it('falls back to email when the session username is cryptographic', () => {
    expect(
      getUserDisplayName({
        email: 'amgad@example.com',
        sessionUsername: '6245a4b4-5081-70c1-11ad-a50bb8fc211d',
        fallback: 'User',
      }),
    ).toBe('amgad@example.com');
  });

  it('uses the fallback when no friendly identifier is available', () => {
    expect(
      getUserDisplayName({
        sessionUsername: '6245a4b4-5081-70c1-11ad-a50bb8fc211d',
        fallback: 'User',
      }),
    ).toBe('User');
  });

  it('builds an avatar initial from the chosen display name', () => {
    expect(getUserDisplayInitial('amgad@example.com')).toBe('A');
  });
});
