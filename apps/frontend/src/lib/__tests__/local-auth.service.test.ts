// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest';
import { localAuthService, deleteLocalUser } from '../local-auth.service';

const EMAIL = 'test@example.com';
const PASSWORD = 'Password123!';

const register = () => localAuthService.signUp(EMAIL, PASSWORD);
const login = (email = EMAIL, password = PASSWORD) => localAuthService.signIn(email, password);

describe('localAuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── signUp ──────────────────────────────────────────────────────────────

  describe('signUp', () => {
    it('registers a new user and returns needsVerification=false', async () => {
      const result = await localAuthService.signUp(EMAIL, PASSWORD);
      expect(result.needsVerification).toBe(false);
    });

    it('throws when the email is already registered', async () => {
      await register();
      await expect(register()).rejects.toThrow('auth.account_exists_error');
    });

    it('normalises email to lowercase before storing', async () => {
      await localAuthService.signUp('UPPER@EXAMPLE.COM', PASSWORD);
      const session = await login('upper@example.com');
      expect(session.email).toBe('upper@example.com');
    });
  });

  // ── signIn ──────────────────────────────────────────────────────────────

  describe('signIn', () => {
    beforeEach(() => register());

    it('returns a session with userId, username, email, and token', async () => {
      const session = await login();
      expect(session.userId).toMatch(/^local-/);
      expect(session.username).toBeTruthy();
      expect(session.email).toBe(EMAIL);
      expect(session.token).toBeTruthy();
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('throws on wrong password', async () => {
      await expect(login(EMAIL, 'wrong')).rejects.toThrow('auth.login_error');
    });

    it('throws for an unregistered email', async () => {
      await expect(login('nobody@example.com')).rejects.toThrow('auth.login_error');
    });

    it('persists the session so getCurrentUser returns it', async () => {
      await login();
      expect(localAuthService.getCurrentUser()).not.toBeNull();
    });
  });

  // ── verifyPassword ───────────────────────────────────────────────────────

  describe('verifyPassword', () => {
    beforeEach(() => register());

    it('resolves when credentials are correct', async () => {
      await expect(localAuthService.verifyPassword(EMAIL, PASSWORD)).resolves.toBeUndefined();
    });

    it('throws on wrong password', async () => {
      await expect(localAuthService.verifyPassword(EMAIL, 'bad')).rejects.toThrow(
        'auth.login_error',
      );
    });
  });

  // ── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('resolves for a registered email', async () => {
      await register();
      await expect(localAuthService.forgotPassword(EMAIL)).resolves.toBeUndefined();
    });

    it('throws for an unregistered email', async () => {
      await expect(localAuthService.forgotPassword('nobody@example.com')).rejects.toThrow(
        'auth.login_error',
      );
    });
  });

  // ── confirmPassword ──────────────────────────────────────────────────────

  describe('confirmPassword', () => {
    beforeEach(() => register());

    it('updates the password so the new one works', async () => {
      await localAuthService.confirmPassword(EMAIL, '123456', 'NewPass999!');
      await expect(login(EMAIL, 'NewPass999!')).resolves.toBeTruthy();
    });

    it('throws for an unregistered email', async () => {
      await expect(
        localAuthService.confirmPassword('nobody@example.com', '000', 'x'),
      ).rejects.toThrow('auth.login_error');
    });
  });

  // ── signOut ──────────────────────────────────────────────────────────────

  describe('signOut', () => {
    it('clears the session', async () => {
      await register();
      await login();
      await localAuthService.signOut();
      expect(localAuthService.getCurrentUser()).toBeNull();
      expect(localAuthService.isAuthenticated()).toBe(false);
    });
  });

  // ── getToken / isAuthenticated ───────────────────────────────────────────

  describe('getToken / isAuthenticated', () => {
    it('returns null and false when not signed in', () => {
      expect(localAuthService.getToken()).toBeNull();
      expect(localAuthService.isAuthenticated()).toBe(false);
    });

    it('returns a token and true after sign-in', async () => {
      await register();
      await login();
      expect(localAuthService.getToken()).toBeTruthy();
      expect(localAuthService.isAuthenticated()).toBe(true);
    });
  });

  // ── deleteLocalUser ──────────────────────────────────────────────────────

  describe('deleteLocalUser', () => {
    it('removes the user so subsequent sign-in fails', async () => {
      await register();
      deleteLocalUser(EMAIL);
      await expect(login()).rejects.toThrow('auth.login_error');
    });

    it('is a no-op for an unregistered email', () => {
      expect(() => deleteLocalUser('nobody@example.com')).not.toThrow();
    });
  });
});
