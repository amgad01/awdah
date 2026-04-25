// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getUserDisplayInitial, getUserDisplayName } from '../user-display';

// ── shared fixtures ──────────────────────────────────────────────────────────

const UUID = '6245a4b4-5081-70c1-11ad-a50bb8fc211d';
const HEX_ID = 'abcdef1234567890abcdef12';

// ── getUserDisplayName ───────────────────────────────────────────────────────

describe('getUserDisplayName', () => {
  it.each([
    [
      'prefers profileUsername over everything',
      { profileUsername: 'Amgad', email: 'a@b.com', sessionUsername: UUID, fallback: 'User' },
      'Amgad',
    ],
    [
      'falls back to email when profileUsername is absent',
      { email: 'a@b.com', sessionUsername: UUID, fallback: 'User' },
      'a@b.com',
    ],
    [
      'falls back to email when profileUsername is empty string',
      { profileUsername: '  ', email: 'a@b.com', fallback: 'User' },
      'a@b.com',
    ],
    [
      'skips UUID session username and uses email',
      { email: 'a@b.com', sessionUsername: UUID, fallback: 'User' },
      'a@b.com',
    ],
    [
      'skips long hex session username and uses email',
      { email: 'a@b.com', sessionUsername: HEX_ID, fallback: 'User' },
      'a@b.com',
    ],
    [
      'uses non-cryptographic session username when no email',
      { sessionUsername: 'amgad', fallback: 'User' },
      'amgad',
    ],
    [
      'falls back to fallback when only UUID session username',
      { sessionUsername: UUID, fallback: 'User' },
      'User',
    ],
    ['falls back to fallback when everything is absent', { fallback: 'User' }, 'User'],
    [
      'falls back to fallback when profileUsername is null',
      { profileUsername: null, email: null, sessionUsername: null, fallback: 'Guest' },
      'Guest',
    ],
  ])('%s', (_label, opts, expected) => {
    expect(getUserDisplayName(opts)).toBe(expected);
  });
});

// ── getUserDisplayInitial ────────────────────────────────────────────────────

describe('getUserDisplayInitial', () => {
  it.each([
    ['amgad@example.com', 'A'],
    ['Zara', 'Z'],
    ['  leading space', 'L'],
  ])('first char of %s → %s', (name, expected) => {
    expect(getUserDisplayInitial(name)).toBe(expected);
  });

  it('returns fallback for empty string', () => {
    expect(getUserDisplayInitial('')).toBe('U');
  });

  it('returns fallback for null', () => {
    expect(getUserDisplayInitial(null)).toBe('U');
  });

  it('returns custom fallback', () => {
    expect(getUserDisplayInitial(null, 'X')).toBe('X');
  });
});
