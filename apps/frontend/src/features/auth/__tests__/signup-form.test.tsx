import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignupForm } from '../signup-form';

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockConfirmSignUp = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string, params?: { email?: string }) =>
      params?.email ? `${key} ${params.email}` : key,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: { error: vi.fn(), success: mockToastSuccess, info: vi.fn() },
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
const STRONG_PASSWORD = 'Test1ng!2345';

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

  it('rejects passwords shorter than the Cognito minimum even when they satisfy the other checks', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('signup-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('signup-password'), {
      target: { value: 'Tota@789' },
    });
    fireEvent.change(screen.getByTestId('signup-confirm-password'), {
      target: { value: 'Tota@789' },
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
    expect(screen.getByText(/auth\.verify_subtitle/)).toHaveTextContent('test@example.com');
  });

  it('returns to the signup form when the user wants to change the email', async () => {
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
      expect(screen.getByTestId('verify-code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('verify-change-email'));

    await waitFor(() => {
      expect(screen.getByTestId('signup-email')).toBeInTheDocument();
    });
    expect(screen.getByTestId('signup-email')).toHaveValue('');
  });

  it('uses the original email for verification and resend actions', async () => {
    mockSignUp.mockResolvedValue({ needsVerification: true });
    mockConfirmSignUp.mockResolvedValue(undefined);
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
      expect(screen.getByTestId('verify-code')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('verify-code'), {
      target: { value: '123456' },
    });
    fireEvent.submit(screen.getByTestId('verify-code').closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockConfirmSignUp).toHaveBeenCalledWith('test@example.com', '123456');
    });
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', STRONG_PASSWORD);

    fireEvent.click(screen.getByTestId('verify-resend'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenLastCalledWith('test@example.com', STRONG_PASSWORD);
    });
  });

  it('navigates to login form when switch link is clicked', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('switch-to-login'));
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it('shows inline duplicate-account guidance on signup failure', async () => {
    mockSignUp.mockRejectedValue(
      new Error('UsernameExistsException: An account with the given email already exists.'),
    );
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
      expect(screen.getByRole('alert')).toHaveTextContent('auth.account_exists_error');
    });

    expect(screen.getByTestId('signup-error-signin')).toBeInTheDocument();
    expect(screen.getByTestId('signup-error-change-email')).toBeInTheDocument();
  });
});
