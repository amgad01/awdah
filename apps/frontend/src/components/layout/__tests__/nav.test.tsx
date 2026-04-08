import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Nav } from '../nav';

const mockSignOut = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    isRTL: false,
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
  }),
}));

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: { dateOfBirth: '1415-01-01', bulughDate: '1430-01-01' },
  }),
}));

vi.mock('@/components/brand-lockup/brand-lockup', () => ({
  BrandLockup: () => <div data-testid="brand-lockup" />,
}));

vi.mock('@/components/ui/language-switcher/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock('@/components/ui/theme-toggle/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe('Nav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNav = () =>
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>,
    );

  it('renders navigation links', () => {
    renderNav();

    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-salah')).toBeInTheDocument();
    expect(screen.getByTestId('nav-sawm')).toBeInTheDocument();
    expect(screen.getByTestId('nav-history')).toBeInTheDocument();
    expect(screen.getAllByTestId('nav-settings')).toHaveLength(2);
  });

  it('renders brand lockup', () => {
    renderNav();
    expect(screen.getByTestId('brand-lockup')).toBeInTheDocument();
  });

  it('renders language switcher and theme toggle', () => {
    renderNav();
    expect(screen.getAllByTestId('language-switcher')).toHaveLength(2);
    expect(screen.getAllByTestId('theme-toggle')).toHaveLength(2);
  });

  it('renders footer links', () => {
    renderNav();
    expect(screen.getAllByTestId('nav-about')).toHaveLength(2);
    expect(screen.getAllByTestId('nav-privacy')).toHaveLength(2);
    expect(screen.getAllByTestId('nav-demo')).toHaveLength(2);
  });

  it('calls signOut and navigates home on logout', async () => {
    mockSignOut.mockResolvedValue(undefined);
    renderNav();

    fireEvent.click(screen.getAllByTestId('logout-button')[0]);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('does not show setup link when profile is complete', () => {
    renderNav();
    expect(screen.queryByTestId('nav-setup')).not.toBeInTheDocument();
  });
});
