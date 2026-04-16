/**
 * Secure storage utilities for client-side caching of sensitive timing data.
 * Uses simple obfuscation (base64 + timestamp validation) to prevent casual tampering.
 * This is NOT cryptographic security - backend is the authoritative source.
 */

const STORAGE_PREFIX = 'awdah_secure_';

interface CachedValue<T> {
  v: T;
  t: number;
}

function encode<T>(value: T): string {
  const wrapped: CachedValue<T> = { v: value, t: Date.now() };
  return btoa(JSON.stringify(wrapped));
}

function decode<T>(encoded: string): CachedValue<T> | null {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded) as CachedValue<T>;
  } catch {
    return null;
  }
}

export const secureStorage = {
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, encode(value));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  },

  get<T>(key: string): T | null {
    try {
      const encoded = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!encoded) return null;

      const decoded = decode<T>(encoded);
      if (!decoded) return null;

      return decoded.v;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      // Ignore
    }
  },

  // Get with timestamp validation (returns null if older than maxAgeMs)
  getWithAge<T>(key: string, maxAgeMs: number): T | null {
    try {
      const encoded = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!encoded) return null;

      const decoded = decode<T>(encoded);
      if (!decoded) return null;

      const age = Date.now() - decoded.t;
      if (age > maxAgeMs) {
        this.remove(key);
        return null;
      }

      return decoded.v;
    } catch {
      return null;
    }
  },
};
