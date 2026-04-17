import { useState, useEffect, useCallback, useMemo } from 'react';
import { secureStorage } from '@/lib/secure-storage';
import type { CooldownController, ResetAction } from '@/types/cooldown.types';

const COOLDOWN_MINUTES = 10;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

const STORAGE_KEYS = {
  prayers: 'reset_prayers_last_attempt',
  fasts: 'reset_fasts_last_attempt',
  export: 'export_data_last_attempt',
} as const;

function getLastAttempt(action: ResetAction): number | null {
  return secureStorage.getWithAge<number>(STORAGE_KEYS[action], COOLDOWN_MS);
}

function setLastAttempt(action: ResetAction, timestamp: number): void {
  secureStorage.set(STORAGE_KEYS[action], timestamp);
}

function calculateRemainingSeconds(lastAttempt: number): number {
  const elapsed = Date.now() - lastAttempt;
  const remaining = Math.max(0, COOLDOWN_MS - elapsed);
  return Math.ceil(remaining / 1000);
}

export function useResetCooldown(action: ResetAction): CooldownController {
  const [lastAttempt, setLastAttemptState] = useState<number | null>(() => getLastAttempt(action));
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const updateRemaining = useCallback(() => {
    if (!lastAttempt) {
      setSecondsRemaining(0);
      return;
    }
    const remaining = calculateRemainingSeconds(lastAttempt);
    setSecondsRemaining(remaining);
  }, [lastAttempt]);

  useEffect(() => {
    // Defer state update to avoid cascading renders warning
    queueMicrotask(updateRemaining);

    if (!lastAttempt || secondsRemaining <= 0) {
      return;
    }

    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lastAttempt, secondsRemaining, updateRemaining]);

  // Listen for storage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = () => {
      const last = getLastAttempt(action);
      setLastAttemptState(last);
      if (last) {
        setSecondsRemaining(calculateRemainingSeconds(last));
      }
    };

    // Also listen for same-tab updates via custom event
    const handleCooldownRecorded = (event: CustomEvent<{ action: ResetAction }>) => {
      if (event.detail.action === action) {
        const last = getLastAttempt(action);
        setLastAttemptState(last);
        if (last) {
          setSecondsRemaining(calculateRemainingSeconds(last));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cooldown-recorded', handleCooldownRecorded as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cooldown-recorded', handleCooldownRecorded as EventListener);
    };
  }, [action]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    setLastAttempt(action, now);
    setLastAttemptState(now);
    setSecondsRemaining(COOLDOWN_MINUTES * 60);
    // Dispatch event for same-tab updates (storage event only fires across tabs)
    window.dispatchEvent(new CustomEvent('cooldown-recorded', { detail: { action } }));
  }, [action]);

  const checkBeforeRequest = useCallback((): boolean => {
    const last = getLastAttempt(action);
    if (!last) return true;

    const remaining = calculateRemainingSeconds(last);
    if (remaining > 0) {
      setLastAttemptState(last);
      setSecondsRemaining(remaining);
      return false;
    }

    return true;
  }, [action]);

  const isCoolingDown = secondsRemaining > 0;
  const canReset = !isCoolingDown;

  return useMemo(
    () => ({
      isCoolingDown,
      secondsRemaining,
      canReset,
      recordAttempt,
      checkBeforeRequest,
    }),
    [isCoolingDown, secondsRemaining, canReset, recordAttempt, checkBeforeRequest],
  );
}

export function formatCooldownTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}
