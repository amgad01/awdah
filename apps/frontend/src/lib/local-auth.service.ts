import type { AuthService, UserSession } from './auth-service';
import { clearPersistedSession, persistSession, readPersistedSession } from './auth-service';

const LOCAL_TOKEN = 'local-dev-token';
const LOCAL_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function localUserId(email: string): string {
  const normalized = normalizeEmail(email);
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
  registry[normalizeEmail(email)] = password;
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
}

export function deleteLocalUser(email: string): void {
  const registry = getRegistry();
  delete registry[normalizeEmail(email)];
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
}

export const localAuthService: AuthService = {
  async signIn(email: string, password: string): Promise<UserSession> {
    const registry = getRegistry();
    const normalizedEmail = normalizeEmail(email);
    const storedPassword = registry[normalizedEmail];

    if (!storedPassword || storedPassword !== password) {
      throw new Error('auth.login_error');
    }

    const session: UserSession = {
      userId: localUserId(email),
      username: normalizedEmail.split('@')[0] || 'dev',
      email: normalizedEmail,
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

  async forgotPassword(email: string): Promise<void> {
    const registry = getRegistry();
    if (!registry[normalizeEmail(email)]) {
      throw new Error('auth.login_error');
    }
    // In local mode, we just accept the flow and pretend an email was sent.
    return Promise.resolve();
  },

  async confirmPassword(email: string, _code: string, newPassword: string): Promise<void> {
    const registry = getRegistry();
    if (!registry[normalizeEmail(email)]) {
      throw new Error('auth.login_error');
    }
    saveToRegistry(email, newPassword);
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
