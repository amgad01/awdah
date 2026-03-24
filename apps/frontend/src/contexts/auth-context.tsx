import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthService, subscribeToAuthChanges, subscribeToAuthNotices } from '@/lib/auth-service';
import type { AuthNotice, UserSession } from '@/lib/auth-service';
import { AuthContext } from '@/contexts/auth-context-value';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAuthService().then((service) => {
      if (cancelled) return;

      const currentUser = service.getCurrentUser();
      setUser(currentUser);
      if (!currentUser) {
        queryClient.clear();
      }
      setLoading(false);
    });

    const unsubscribeAuth = subscribeToAuthChanges((nextUser) => {
      if (cancelled) return;

      setUser(nextUser);
      if (nextUser) {
        setAuthNotice(null);
      } else {
        queryClient.clear();
      }
      setLoading(false);
    });

    const unsubscribeNotice = subscribeToAuthNotices((notice) => {
      if (cancelled) return;
      setAuthNotice(notice);
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      unsubscribeNotice();
    };
  }, [queryClient]);

  const checkUser = useCallback(async () => {
    const service = await getAuthService();
    const currentUser = service.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setAuthNotice(null);
      return;
    }
    queryClient.clear();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    const service = await getAuthService();
    setAuthNotice(null);
    await service.signOut();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const service = await getAuthService();
    const session = await service.signIn(email, password);
    setAuthNotice(null);
    setUser(session);
    return session;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, authNotice, checkUser, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
