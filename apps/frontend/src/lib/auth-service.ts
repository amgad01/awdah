export const TOKEN_KEY = 'awdah_auth_token';
export const USER_KEY = 'awdah_auth_user';
const AUTH_CHANGE_EVENT = 'awdah:auth-change';
const AUTH_NOTICE_EVENT = 'awdah:auth-notice';
const SESSION_EXPIRY_SKEW_MS = 30_000;

export type UserSession = {
  userId: string;
  username: string;
  email?: string;
  token: string;
  expiresAt: number;
};

export type AuthNotice = 'session-expired';

export interface AuthService {
  signIn(email: string, password: string): Promise<UserSession>;
  signUp(email: string, password: string): Promise<{ needsVerification: boolean }>;
  confirmSignUp(email: string, code: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  confirmPassword(email: string, code: string, newPassword: string): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): UserSession | null;
  getToken(): string | null;
  isAuthenticated(): boolean;
}

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'cognito';

let authServiceInstance: AuthService | null = null;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function emitWindowEvent<T>(eventName: string, detail: T): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
}

function isSessionExpired(session: UserSession): boolean {
  return session.expiresAt <= Date.now() + SESSION_EXPIRY_SKEW_MS;
}

export function persistSession(session: UserSession): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(TOKEN_KEY, session.token);
  storage.setItem(USER_KEY, JSON.stringify(session));
  emitWindowEvent<UserSession | null>(AUTH_CHANGE_EVENT, session);
}

export function publishAuthNotice(notice: AuthNotice): void {
  emitWindowEvent<AuthNotice>(AUTH_NOTICE_EVENT, notice);
}

export function clearPersistedSession(notice?: AuthNotice): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }

  emitWindowEvent<UserSession | null>(AUTH_CHANGE_EVENT, null);

  if (notice) {
    publishAuthNotice(notice);
  }
}

export function readPersistedSession(): UserSession | null {
  const storage = getStorage();
  if (!storage) return null;

  const userJson = storage.getItem(USER_KEY);
  if (!userJson) return null;

  try {
    const session = JSON.parse(userJson) as UserSession;

    if (!session.expiresAt || isSessionExpired(session)) {
      clearPersistedSession('session-expired');
      return null;
    }

    return session;
  } catch {
    clearPersistedSession();
    return null;
  }
}

export function getPersistedToken(): string | null {
  return readPersistedSession()?.token ?? null;
}

export function subscribeToAuthChanges(
  listener: (session: UserSession | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handler = (event: Event) => {
    listener((event as CustomEvent<UserSession | null>).detail ?? null);
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, handler);
}

export function subscribeToAuthNotices(listener: (notice: AuthNotice) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handler = (event: Event) => {
    const notice = (event as CustomEvent<AuthNotice>).detail;
    if (notice) listener(notice);
  };

  window.addEventListener(AUTH_NOTICE_EVENT, handler);
  return () => window.removeEventListener(AUTH_NOTICE_EVENT, handler);
}

export async function getAuthService(): Promise<AuthService> {
  if (authServiceInstance) return authServiceInstance;

  let service: AuthService;
  if (AUTH_MODE === 'local') {
    const mod = await import('./local-auth.service.ts');
    service = mod.localAuthService;
  } else {
    const mod = await import('./cognito-auth.service.ts');
    service = mod.cognitoAuthService;
  }

  authServiceInstance = service;
  return service;
}

export function getAuthServiceSync(): AuthService | null {
  return authServiceInstance;
}
