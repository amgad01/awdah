import type { AuthService, UserSession } from './auth-service';
import { clearPersistedSession, persistSession, readPersistedSession } from './auth-service';

const LOCAL_TOKEN = 'local-dev-token';
const LOCAL_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function localUserId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `local-${safe || 'dev-user'}`;
}

export const localAuthService: AuthService = {
  async signIn(email: string, password: string): Promise<UserSession> {
    void password;
    const session: UserSession = {
      userId: localUserId(email),
      username: email.split('@')[0] || 'dev',
      email,
      token: LOCAL_TOKEN,
      expiresAt: Date.now() + LOCAL_SESSION_DURATION_MS,
    };

    persistSession(session);

    return session;
  },

  async signUp(_email: string, _password: string): Promise<{ needsVerification: boolean }> {
    return { needsVerification: false };
  },

  async confirmSignUp(_email: string, _code: string): Promise<void> {
    // No-op for local development
  },

  async signOut(): Promise<void> {
    clearPersistedSession();
  },

  getCurrentUser(): UserSession | null {
    return readPersistedSession();
  },

  getToken(): string | null {
    return readPersistedSession()?.token ?? null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
