export const TOKEN_KEY = 'awdah_auth_token';
export const USER_KEY = 'awdah_auth_user';

export type UserSession = {
  userId: string;
  username: string;
  email?: string;
  token: string;
};

export interface AuthService {
  signIn(email: string, password: string): Promise<UserSession>;
  signUp(email: string, password: string): Promise<{ needsVerification: boolean }>;
  confirmSignUp(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): UserSession | null;
  getToken(): string | null;
  isAuthenticated(): boolean;
}

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'cognito';

let authServiceInstance: AuthService | null = null;

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
