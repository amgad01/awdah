import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignupForm } from '../signup-form';

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockConfirmSignUp = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: { error: mockToastError, success: mockToastSuccess, info: vi.fn() },
  }),
}));

vi.mock('@/lib/auth-service', () => ({
  getAuthService: () =>
    Promise.resolve({
      signUp: mockSignUp,
      signIn: mockSignIn,
      confirmSignUp: mockConfirmSignUp,
    }),
}));

/** A password that satisfies all five signup checks */
const STRONG_PASSWORD = 'Test1ng!';

describe('SignupForm', () => {
  const onSuccess = vi.fn();
  const onSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(<SignupForm onSuccess={onSuccess} onSwitchToLogin={onSwitchToLogin} />);

  it('renders signup form with email, password, and confirm password fields', () => {
    renderForm();

    expect(screen.getByTestId('signup-email')).toBeInTheDocument();
    expect(screen.getByTestId('signup-password')).toBeInTheDocument();
    expect(screen.getByTestId('signup-confirm-password')).toBeInTheDocument();
    expect(screen.getByTestId('signup-submit')).toBeInTheDocument();
  });

  it('disables submit when password requirements are not met', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('signup-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: 'weak' },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: 'weak' },
    });

    expect(screen.getByTestId('signup-submit')).toBeDisabled();
  });

  it('shows password requirements checklist when typing', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: 'a' },
    });

    expect(screen.getByText('auth.password_requirement_length')).toBeInTheDocument();
    expect(screen.getByText('auth.password_requirement_lowercase')).toBeInTheDocument();
    expect(screen.getByText('auth.password_requirement_uppercase')).toBeInTheDocument();
    expect(screen.getByText('auth.password_requirement_number')).toBeInTheDocument();
    expect(screen.getByText('auth.password_requirement_symbol')).toBeInTheDocument();
  });

  it('shows match hint when confirm password is typed', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: 'mismatch' },
    });

    expect(screen.getByText('auth.passwords_do_not_match')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: STRONG_PASSWORD },
    });

    expect(screen.getByText('auth.passwords_match')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    renderForm();

    fireEvent.change(screen.getByTestId('signup-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: 'Different1!' },
    });

    // Button should be disabled because passwords don't match
    expect(screen.getByTestId('signup-submit')).toBeDisabled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp and signIn on successful registration without verification', async () => {
    mockSignUp.mockResolvedValue({ needsVerification: false });
    mockSignIn.mockResolvedValue({ userId: 'user-1', token: 'tok' });
    renderForm();

    fireEvent.change(screen.getByTestId('signup-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(mockSignUp).toHaveBeenCalledWith('test@example.com', STRONG_PASSWORD);
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', STRONG_PASSWORD);
  });

  it('switches to verification phase when verification is needed', async () => {
    mockSignUp.mockResolvedValue({ needsVerification: true });
    renderForm();

    fireEvent.change(screen.getByTestId('signup-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(screen.getByText('auth.verify_title')).toBeInTheDocument();
    });
  });

  it('navigates to login form when switch link is clicked', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('switch-to-login'));
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it('shows error toast on signup failure', async () => {
    mockSignUp.mockRejectedValue(new Error('Email already exists'));
    renderForm();

    fireEvent.change(screen.getByTestId('signup-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: STRONG_PASSWORD },
    });
    fireEvent.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email already exists');
    });
  });
});
