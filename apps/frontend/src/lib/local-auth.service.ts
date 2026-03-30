import type { AuthService, UserSession } from './auth-service';
import { clearPersistedSession, persistSession, readPersistedSession } from './auth-service';

const LOCAL_TOKEN = 'local-dev-token';
const LOCAL_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function localUserId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `local-${safe || 'dev-user'}`;
}

const USERS_REGISTRY_KEY = 'awdah_local_users_registry';

function getRegistry(): Record<string, string> {
  const stored = localStorage.getItem(USERS_REGISTRY_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveToRegistry(email: string, password: string): void {
  const registry = getRegistry();
  registry[email.toLowerCase()] = password;
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
}

export const localAuthService: AuthService = {
  async signIn(email: string, password: string): Promise<UserSession> {
    const registry = getRegistry();
    const storedPassword = registry[email.toLowerCase()];

    if (!storedPassword || storedPassword !== password) {
      throw new Error('auth.login_error');
    }

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

  async signUp(email: string, password: string): Promise<{ needsVerification: boolean }> {
    saveToRegistry(email, password);
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
