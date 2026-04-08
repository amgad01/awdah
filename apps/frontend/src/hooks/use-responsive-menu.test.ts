import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveMenu } from './use-responsive-menu';

describe('useResponsiveMenu', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useResponsiveMenu());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles open and closed', () => {
    const { result } = renderHook(() => useResponsiveMenu());

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });

  it('close() sets isOpen to false', () => {
    const { result } = renderHook(() => useResponsiveMenu());

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('closes on Escape key', () => {
    const { result } = renderHook(() => useResponsiveMenu());

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('closes on click outside', () => {
    const { result } = renderHook(() => useResponsiveMenu());

    // Simulate refs pointing at DOM elements
    const menuEl = document.createElement('div');
    const triggerEl = document.createElement('button');
    document.body.appendChild(menuEl);
    document.body.appendChild(triggerEl);

    // Manually assign refs
    Object.defineProperty(result.current.menuRef, 'current', {
      value: menuEl,
      writable: true,
    });
    Object.defineProperty(result.current.triggerRef, 'current', {
      value: triggerEl,
      writable: true,
    });

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    // Click outside both elements
    act(() => {
      document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(false);

    document.body.removeChild(menuEl);
    document.body.removeChild(triggerEl);
  });

  it('does not close on click inside menu', () => {
    const { result } = renderHook(() => useResponsiveMenu());

    const menuEl = document.createElement('div');
    const childEl = document.createElement('span');
    menuEl.appendChild(childEl);
    document.body.appendChild(menuEl);

    Object.defineProperty(result.current.menuRef, 'current', {
      value: menuEl,
      writable: true,
    });

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      childEl.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(result.current.isOpen).toBe(true);

    document.body.removeChild(menuEl);
  });

  it('does not register listeners when closed', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { result } = renderHook(() => useResponsiveMenu());
    expect(result.current.isOpen).toBe(false);

    // No listeners added while closed
    const listenCalls = addSpy.mock.calls.filter(
      ([name]) => name === 'pointerdown' || name === 'keydown',
    );
    expect(listenCalls.length).toBe(0);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('removes listeners when closed after being opened', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { result } = renderHook(() => useResponsiveMenu());

    // Open and then close
    act(() => result.current.toggle());
    act(() => result.current.close());

    // Verify cleanup happened
    const removeCalls = removeSpy.mock.calls.filter(
      ([name]) => name === 'pointerdown' || name === 'keydown',
    );
    expect(removeCalls.length).toBeGreaterThanOrEqual(2);

    removeSpy.mockRestore();
  });

  it('provides stable refs', () => {
    const { result } = renderHook(() => useResponsiveMenu());
    expect(result.current.menuRef).toBeDefined();
    expect(result.current.triggerRef).toBeDefined();
    expect(result.current.menuRef.current).toBeNull();
    expect(result.current.triggerRef.current).toBeNull();
  });
});
