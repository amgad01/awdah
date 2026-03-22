import { useState, useEffect, useCallback } from 'react';
import { getAuthService, getAuthServiceSync, type UserSession } from '@/lib/auth-service';

export const useAuth = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthService().then((service) => {
      const currentUser = service.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  const checkUser = useCallback(async () => {
    const service = await getAuthService();
    setUser(service.getCurrentUser());
  }, []);

  const signOut = useCallback(async () => {
    const service = await getAuthService();
    await service.signOut();
    setUser(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const service = await getAuthService();
    const session = await service.signIn(email, password);
    setUser(session);
    return session;
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    checkUser,
    signIn,
    signOut,
  };
};

export { getAuthService, getAuthServiceSync };
