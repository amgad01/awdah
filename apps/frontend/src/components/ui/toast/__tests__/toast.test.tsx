import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast } from '../toast';

describe('Toast', () => {
  const defaultProps = {
    id: 'toast-1',
    type: 'success' as const,
    message: 'Operation completed successfully',
    duration: 5000,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
  });

  it('renders with role="alert" for accessibility', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders dismiss button with aria-label', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<Toast {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Dismiss notification'));

    // Wait for exit animation
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(defaultProps.onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('auto-dismisses after duration', () => {
    render(<Toast {...defaultProps} duration={3000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Wait for exit animation
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(defaultProps.onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('renders success variant', () => {
    render(<Toast {...defaultProps} type="success" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error variant', () => {
    render(<Toast {...defaultProps} type="error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders info variant', () => {
    render(<Toast {...defaultProps} type="info" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
