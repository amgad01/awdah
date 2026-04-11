import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordForm } from '../forgot-password-form';

const mockForgotPassword = vi.fn();
const mockConfirmPassword = vi.fn();
const mockSignIn = vi.fn();

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/auth-service', () => ({
  getAuthService: () =>
    Promise.resolve({
      forgotPassword: mockForgotPassword,
      confirmPassword: mockConfirmPassword,
      signIn: mockSignIn,
    }),
}));

describe('ForgotPasswordForm', () => {
  const onSuccess = vi.fn();
  const onSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(<ForgotPasswordForm onSuccess={onSuccess} onSwitchToLogin={onSwitchToLogin} />);

  it('renders forgot password request fields', () => {
    renderForm();

    expect(screen.getByTestId('forgot-email')).toBeInTheDocument();
    expect(screen.getByTestId('forgot-submit')).toBeInTheDocument();
  });

  it('moves to confirm phase after requesting a reset code', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    renderForm();

    fireEvent.change(screen.getByTestId('forgot-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByTestId('forgot-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-code')).toBeInTheDocument();
    });
  });

  it('shows inline error when requesting reset code fails', async () => {
    mockForgotPassword.mockRejectedValue(new Error('oops'));
    renderForm();

    fireEvent.change(screen.getByTestId('forgot-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByTestId('forgot-submit'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('auth.forgot_password_error');
    });
  });

  it('shows inline password mismatch error during confirmation', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    renderForm();

    fireEvent.change(screen.getByTestId('forgot-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByTestId('forgot-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-code')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('forgot-code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByTestId('forgot-new-password'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByTestId('forgot-confirm-password'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByTestId('forgot-confirm-submit'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('auth.password_mismatch');
    });
  });

  it('resets password and signs in on confirm success', async () => {
    mockForgotPassword.mockResolvedValue(undefined);
    mockConfirmPassword.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ userId: 'user-1', token: 'tok' });
    renderForm();

    fireEvent.change(screen.getByTestId('forgot-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByTestId('forgot-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-code')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('forgot-code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByTestId('forgot-new-password'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByTestId('forgot-confirm-password'), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByTestId('forgot-confirm-submit'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(mockConfirmPassword).toHaveBeenCalledWith('test@example.com', '123456', 'Password123!');
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password123!');
  });
});
