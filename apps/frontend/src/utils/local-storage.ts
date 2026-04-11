function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalStorage(key: string): string | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function isLocalStorageExpiryActive(key: string, now = Date.now()): boolean {
  const stored = readLocalStorage(key);
  if (!stored) {
    return false;
  }

  const expiresAt = Number.parseInt(stored, 10);
  return Number.isFinite(expiresAt) && now < expiresAt;
}

export function writeLocalStorageExpiry(
  key: string,
  durationMs: number,
  now = Date.now(),
): boolean {
  return writeLocalStorage(key, String(now + durationMs));
}
