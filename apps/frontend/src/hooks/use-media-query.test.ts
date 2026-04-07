import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let mqlListeners: Map<string, Array<(event: MediaQueryListEvent) => void>>;

  beforeEach(() => {
    mqlListeners = new Map();
    matchMediaMock = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (!mqlListeners.has(query)) {
          mqlListeners.set(query, []);
        }
        mqlListeners.get(query)?.push(listener);
      },
      removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        const listeners = mqlListeners.get(query);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      },
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock as unknown as Window['matchMedia'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false on initial render (hydration safety)', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('updates when media query matches', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerMock = vi.fn();
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();
    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when media query changes', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    const listeners = mqlListeners.get('(min-width: 768px)');
    expect(listeners).toBeDefined();

    if (listeners && listeners[0]) {
      listeners[0]({ matches: true } as MediaQueryListEvent);
    }

    expect(result.current).toBe(true);
  });

  it('handles different media queries independently', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result: mobileResult } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    const { result: desktopResult } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(mobileResult.current).toBe(false);
    expect(desktopResult.current).toBe(true);
  });
});
