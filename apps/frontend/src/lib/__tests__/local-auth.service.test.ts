import { beforeEach, describe, expect, it } from 'vitest';
import { localAuthService, deleteLocalUser } from '../local-auth.service';

describe('localAuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('normalizes emails consistently for sign-in', async () => {
    await localAuthService.signUp('User@example.com', 'secret');

    const session = await localAuthService.signIn(' user@example.com ', 'secret');

    expect(session.email).toBe('user@example.com');
    expect(session.userId).toBe('local-user-example-com');
  });

  it('removes deleted local users from the registry', async () => {
    await localAuthService.signUp('user@example.com', 'secret');
    deleteLocalUser('USER@example.com');

    await expect(localAuthService.signIn('user@example.com', 'secret')).rejects.toThrow(
      'auth.login_error',
    );
  });
});
