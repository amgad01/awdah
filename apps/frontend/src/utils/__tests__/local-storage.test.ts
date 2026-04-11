import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isLocalStorageExpiryActive,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
  writeLocalStorageExpiry,
} from '../local-storage';

describe('local-storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reads and writes local storage values safely', () => {
    expect(writeLocalStorage('demo-key', 'demo-value')).toBe(true);
    expect(readLocalStorage('demo-key')).toBe('demo-value');
    expect(removeLocalStorage('demo-key')).toBe(true);
    expect(readLocalStorage('demo-key')).toBeNull();
  });

  it('tracks active expiry timestamps', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);

    expect(writeLocalStorageExpiry('expiry-key', 500)).toBe(true);
    expect(isLocalStorageExpiryActive('expiry-key')).toBe(true);

    vi.spyOn(Date, 'now').mockReturnValue(2_000);
    expect(isLocalStorageExpiryActive('expiry-key')).toBe(false);
  });

  it('returns false for invalid expiry values', () => {
    localStorage.setItem('expiry-key', 'not-a-number');
    expect(isLocalStorageExpiryActive('expiry-key')).toBe(false);
  });
});
