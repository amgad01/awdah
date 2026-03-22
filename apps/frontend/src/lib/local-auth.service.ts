import type { AuthService, UserSession } from './auth-service';
import { TOKEN_KEY, USER_KEY } from './auth-service';

const LOCAL_TOKEN = 'local-dev-token';

export const localAuthService: AuthService = {
  async signIn(email: string, password: string): Promise<UserSession> {
    void password;
    const session: UserSession = {
      userId: 'local-dev-user',
      username: email.split('@')[0] || 'dev',
      email,
      token: LOCAL_TOKEN,
    };

    localStorage.setItem(TOKEN_KEY, LOCAL_TOKEN);
    localStorage.setItem(USER_KEY, JSON.stringify(session));

    return session;
  },

  async signUp(_email: string, _password: string): Promise<{ needsVerification: boolean }> {
    return { needsVerification: false };
  },

  async confirmSignUp(_email: string, _code: string): Promise<void> {
    // No-op for local development
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser(): UserSession | null {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
