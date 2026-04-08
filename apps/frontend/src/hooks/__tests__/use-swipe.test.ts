import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSwipe } from '../use-swipe';

type SwipeHookResult = ReturnType<typeof useSwipe>;

describe('useSwipe', () => {
  const onSwipeLeft = vi.fn();
  const onSwipeRight = vi.fn();

  beforeEach(() => {
    onSwipeLeft.mockReset();
    onSwipeRight.mockReset();
  });

  const startSwipe = (result: { current: SwipeHookResult }, clientX: number) => {
    act(() => {
      result.current.handlers.onTouchStart({
        touches: [{ clientX, clientY: 20 }],
      } as never);
    });
  };

  const endSwipe = (result: { current: SwipeHookResult }, clientX: number) => {
    act(() => {
      result.current.handlers.onTouchEnd({
        changedTouches: [{ clientX, clientY: 20 }],
      } as never);
    });
  };

  it('detects rightward swipes that exceed the threshold', () => {
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 }));
    const swipeResult = result as { current: SwipeHookResult };

    startSwipe(swipeResult, 100);
    expect(swipeResult.current.isDragging).toBe(true);

    endSwipe(swipeResult, 180);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(swipeResult.current.isDragging).toBe(false);
  });

  it('detects leftward swipes that exceed the threshold', () => {
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 }));
    const swipeResult = result as { current: SwipeHookResult };

    startSwipe(swipeResult, 200);
    endSwipe(swipeResult, 120);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(swipeResult.current.isDragging).toBe(false);
  });

  it('ignores swipes that do not exceed the threshold', () => {
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 }));
    const swipeResult = result as { current: SwipeHookResult };

    startSwipe(swipeResult, 150);
    endSwipe(swipeResult, 110);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(swipeResult.current.isDragging).toBe(false);
  });

  it('ignores diagonal swipes when vertical movement dominates', () => {
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 }));
    const swipeResult = result as { current: SwipeHookResult };

    act(() => {
      swipeResult.current.handlers.onTouchStart({
        touches: [{ clientX: 150, clientY: 20 }],
      } as never);
    });

    act(() => {
      swipeResult.current.handlers.onTouchEnd({
        changedTouches: [{ clientX: 220, clientY: 140 }],
      } as never);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(swipeResult.current.isDragging).toBe(false);
  });

  it('does not trigger handlers when the swipe never completes', () => {
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 }));
    const swipeResult = result as { current: SwipeHookResult };

    act(() => {
      swipeResult.current.handlers.onTouchStart({
        touches: [{ clientX: 160, clientY: 20 }],
      } as never);
    });

    expect(swipeResult.current.isDragging).toBe(true);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
