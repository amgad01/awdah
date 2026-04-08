import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '../login-form';

const mockSignIn = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: { error: mockToastError, success: vi.fn(), info: vi.fn() },
  }),
}));

vi.mock('@/lib/auth-service', () => ({
  getAuthService: () =>
    Promise.resolve({
      signIn: mockSignIn,
    }),
}));

describe('LoginForm', () => {
  const onSuccess = vi.fn();
  const onSwitchToSignup = vi.fn();
  const onSwitchToForgotPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(
      <LoginForm
        onSuccess={onSuccess}
        onSwitchToSignup={onSwitchToSignup}
        onSwitchToForgotPassword={onSwitchToForgotPassword}
      />,
    );

  it('renders login form with email and password fields', () => {
    renderForm();

    expect(screen.getByTestId('login-email')).toBeInTheDocument();
    expect(screen.getByTestId('login-password')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeInTheDocument();
  });

  it('renders the title', () => {
    renderForm();

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('auth.login');
  });

  it('calls onSuccess after successful login', async () => {
    mockSignIn.mockResolvedValue({ userId: 'user-1', token: 'tok' });
    renderForm();

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error toast on login failure', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));
    renderForm();

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('auth.login_error');
    });
  });

  it('navigates to signup form when switch link is clicked', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('switch-to-signup'));
    expect(onSwitchToSignup).toHaveBeenCalledTimes(1);
  });

  it('disables submit button while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})); // never resolves
    renderForm();

    fireEvent.change(screen.getByTestId('login-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('login-password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('login-submit')).toBeDisabled();
    });
  });
});
