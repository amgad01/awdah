import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../progress-bar';
import { describe, it, expect, vi } from 'vitest';

// Mock useLanguage
vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    fmtNumber: (n: number) => n.toString(),
  }),
}));

describe('ProgressBar', () => {
  it('renders progress correctly', () => {
    render(<ProgressBar value={50} max={100} label="Test Progress" />);

    const pb = screen.getByRole('progressbar');
    expect(pb).toHaveAttribute('value', '50');
    expect(pb).toHaveAttribute('max', '100');

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('Test Progress')).toBeInTheDocument();
  });

  it('caps percentage at 100', () => {
    render(<ProgressBar value={150} max={100} label="Over Progress" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles zero max gracefully', () => {
    render(<ProgressBar value={0} max={0} label="Zero" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
