import { createContext } from 'react';
import type { AuthNotice, UserSession } from '@/lib/auth-service';

export interface AuthContextValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  authNotice: AuthNotice | null;
  checkUser: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserSession>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
