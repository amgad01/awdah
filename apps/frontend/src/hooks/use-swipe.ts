import { useCallback, useRef, useState } from 'react';

interface SwipeState {
  startX: number;
  startY: number;
  isDragging: boolean;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions) {
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setSwipeState({
      startX: clientX,
      startY: clientY,
      isDragging: true,
    });
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!swipeState?.isDragging) return;

      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
      const deltaX = clientX - swipeState.startX;
      const deltaY = clientY - swipeState.startY;

      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        setSwipeState(null);
        return;
      }

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }

      setSwipeState(null);
    },
    [swipeState, threshold, onSwipeLeft, onSwipeRight],
  );

  return {
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleTouchStart,
      onMouseUp: handleTouchEnd,
      onMouseLeave: handleTouchEnd,
    },
    isDragging: swipeState?.isDragging ?? false,
  };
}
