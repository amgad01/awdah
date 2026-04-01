import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthService, subscribeToAuthChanges, subscribeToAuthNotices } from '@/lib/auth-service';
import type { AuthNotice, UserSession } from '@/lib/auth-service';
import { AuthContext } from '@/contexts/auth-context-value';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  const applySession = useCallback(
    (nextUser: UserSession | null) => {
      const previousUserId = previousUserIdRef.current;
      const nextUserId = nextUser?.userId ?? null;
      const switchedUsers =
        previousUserId !== null && nextUserId !== null && previousUserId !== nextUserId;

      if (switchedUsers || !nextUser) {
        queryClient.clear();
      }

      previousUserIdRef.current = nextUserId;
      setUser(nextUser);
      if (nextUser) {
        setAuthNotice(null);
      }
      setLoading(false);
    },
    [queryClient],
  );

  useEffect(() => {
    let cancelled = false;

    getAuthService().then((service) => {
      if (cancelled) return;

      applySession(service.getCurrentUser());
    });

    const unsubscribeAuth = subscribeToAuthChanges((nextUser) => {
      if (cancelled) return;
      applySession(nextUser);
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
  }, [applySession]);

  const checkUser = useCallback(async () => {
    const service = await getAuthService();
    applySession(service.getCurrentUser());
  }, [applySession]);

  const signOut = useCallback(async () => {
    const service = await getAuthService();
    setAuthNotice(null);
    await service.signOut();
    applySession(service.getCurrentUser());
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const service = await getAuthService();
      const session = await service.signIn(email, password);
      applySession(session);
      return session;
    },
    [applySession],
  );

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, authNotice, checkUser, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
