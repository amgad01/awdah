import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from '../error-state';
import { describe, it, expect, vi } from 'vitest';

// Mock useLanguage
vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('ErrorState', () => {
  it('renders message correctly', () => {
    render(<ErrorState message="Test Error" />);
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('common.error')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState message="Error" title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('calls onRetry when button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);

    const retryButton = screen.getByRole('button');
    expect(retryButton).toHaveTextContent('common.retry');

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom retry label', () => {
    render(<ErrorState message="Error" onRetry={() => {}} retryLabel="Try Again" />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
