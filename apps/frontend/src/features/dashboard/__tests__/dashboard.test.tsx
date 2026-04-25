import { render, screen } from '@testing-library/react';
import { Dashboard } from '../dashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorship, useStreak, useStreakDetails } from '@/hooks/use-worship';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useDualDate } from '@/hooks/use-dual-date';
import { useProfile } from '@/hooks/use-profile';

// Mock all hooks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-language', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('@/hooks/use-worship', () => ({
  useWorship: vi.fn(),
  useStreak: vi.fn(),
  useStreakDetails: vi.fn(),
  useSalahHistory: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/use-dual-date', () => ({
  useDualDate: vi.fn(),
}));

vi.mock('@/hooks/use-profile', () => ({
  useProfile: vi.fn(),
}));

// Mock sub-components that are complex or have their own logic
vi.mock('../dashboard-hero', () => ({
  DashboardHero: () => <div data-testid="dashboard-hero" />,
}));
vi.mock('../snapshot-grid', () => ({
  SnapshotGrid: () => <div data-testid="snapshot-grid" />,
}));
vi.mock('../salah-debt-card', () => ({
  SalahDebtCard: () => <div data-testid="salah-debt-card" />,
}));
vi.mock('../sawm-summary-card', () => ({
  SawmSummaryCard: () => <div data-testid="sawm-summary-card" />,
}));
vi.mock('../streak-card', () => ({
  StreakCard: () => <div data-testid="streak-card" />,
}));
vi.mock('../practice-check-in', () => ({
  PracticeCheckIn: () => <div data-testid="practice-check-in" />,
}));
vi.mock('@/features/salah/prayer-logger', () => ({
  PrayerLogger: () => <div data-testid="prayer-logger" />,
}));
vi.mock('../use-celebration', () => ({
  useCelebration: () => ({ celebration: null, dismiss: vi.fn() }),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(useLanguage).mockReturnValue({
      t: (key: string) => key,
      fmtNumber: (n: number) => n.toString(),
      language: 'en',
      isRTL: false,
    } as any);

    vi.mocked(useDualDate).mockReturnValue({
      format: () => ({ primary: 'Primary Date', secondary: 'Secondary Date' }),
    } as any);

    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'testuser', email: 'test@example.com' },
    } as any);

    vi.mocked(useProfile).mockReturnValue({
      data: { username: 'Amgad' },
    } as any);

    vi.mocked(useWorship).mockReturnValue({
      salahDebt: { remainingPrayers: 10, completedPrayers: 5, totalPrayersOwed: 15 },
      sawmDebt: { remainingDays: 2, completedDays: 1, totalDaysOwed: 3 },
      loading: false,
      error: null,
    } as any);

    vi.mocked(useStreak).mockReturnValue({
      streak: 5,
      milestone: null,
    } as any);

    vi.mocked(useStreakDetails).mockReturnValue({
      bestPrayerStreak: { name: 'Fajr', count: 10 },
      activePrayerStreaks: [{ name: 'Fajr', count: 10 }],
      monThuStreak: 2,
      obligatoryStreak: 3,
      fastStreak: 1,
      qadaaFastStreak: 0,
    } as any);
  });

  it('renders loading state', () => {
    vi.mocked(useWorship).mockReturnValue({ loading: true } as any);
    render(<Dashboard />);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useWorship).mockReturnValue({ error: new Error('Failed'), loading: false } as any);
    render(<Dashboard />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders dashboard components when data is loaded', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-hero')).toBeInTheDocument();
    expect(screen.getByTestId('snapshot-grid')).toBeInTheDocument();
    expect(screen.getByTestId('salah-debt-card')).toBeInTheDocument();
    expect(screen.getByTestId('sawm-summary-card')).toBeInTheDocument();
    expect(screen.getByTestId('streak-card')).toBeInTheDocument();
  });

  it('renders cleared banner when all debt is cleared', () => {
    vi.mocked(useWorship).mockReturnValue({
      salahDebt: { remainingPrayers: 0, completedPrayers: 15, totalPrayersOwed: 15 },
      sawmDebt: { remainingDays: 0, completedDays: 3, totalDaysOwed: 3 },
      loading: false,
      error: null,
    } as any);
    render(<Dashboard />);
    expect(screen.getByText('dashboard.debt_cleared_title')).toBeInTheDocument();
  });
});
