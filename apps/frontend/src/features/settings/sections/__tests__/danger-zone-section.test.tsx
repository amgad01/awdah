import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DangerZoneSection } from '../danger-zone-section';

const {
  mockVerifyPassword,
  mockSignOut,
  mockDeleteAccount,
  mockToastInfo,
  mockDeleteLocalUser,
  mockClearOnboardingLocalState,
} = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockDeleteAccount: vi.fn(),
  mockToastInfo: vi.fn(),
  mockDeleteLocalUser: vi.fn(),
  mockClearOnboardingLocalState: vi.fn(),
}));

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      email: 'test@example.com',
      username: 'test@example.com',
      userId: 'user-1',
    },
    verifyPassword: mockVerifyPassword,
    signOut: mockSignOut,
  }),
}));

vi.mock('@/hooks/use-profile', () => ({
  useDeleteAccount: () => ({
    mutateAsync: mockDeleteAccount,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      info: mockToastInfo,
    },
  }),
}));

vi.mock('../../components', () => ({
  SettingsSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/lib/local-auth.service', () => ({
  deleteLocalUser: mockDeleteLocalUser,
}));

vi.mock('@/lib/onboarding-state', () => ({
  clearOnboardingLocalState: mockClearOnboardingLocalState,
}));

describe('DangerZoneSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderSection() {
    render(<DangerZoneSection />);
  }

  async function openDeleteConfirmation(password: string) {
    fireEvent.click(screen.getByTestId('delete-account-button'));
    fireEvent.change(screen.getByLabelText('settings.delete_confirm_password'), {
      target: { value: password },
    });
    fireEvent.click(screen.getByRole('button', { name: 'settings.delete_confirm_btn' }));
  }

  it('shows workflow failures instead of mislabeling them as password errors', async () => {
    mockVerifyPassword.mockResolvedValue(undefined);
    mockDeleteAccount.mockRejectedValue(new Error('common.task_failed'));

    renderSection();
    await openDeleteConfirmation('CorrectPassword1!');

    await waitFor(() => {
      expect(screen.getByTestId('settings-delete-error')).toHaveTextContent('common.task_failed');
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('signs the user out after successful account deletion', async () => {
    mockVerifyPassword.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue({ message: 'deleted', authDeleted: true });
    mockSignOut.mockResolvedValue(undefined);

    renderSection();
    await openDeleteConfirmation('CorrectPassword1!');

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockClearOnboardingLocalState).toHaveBeenCalledWith('user-1');
  });
});
