import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataManagementSection } from '../data-management-section';

const { mockVerifyPassword, mockExportData, mockResetPrayerLogs, mockResetFastLogs } = vi.hoisted(
  () => ({
    mockVerifyPassword: vi.fn(),
    mockExportData: vi.fn(),
    mockResetPrayerLogs: vi.fn(),
    mockResetFastLogs: vi.fn(),
  }),
);

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
    },
    verifyPassword: mockVerifyPassword,
  }),
}));

vi.mock('@/hooks/use-profile', () => ({
  useExportData: () => ({
    isPending: false,
    mutateAsync: mockExportData,
  }),
}));

vi.mock('@/hooks/use-worship', () => ({
  useResetPrayerLogs: () => ({
    isPending: false,
    mutateAsync: mockResetPrayerLogs,
  }),
  useResetFastLogs: () => ({
    isPending: false,
    mutateAsync: mockResetFastLogs,
  }),
}));

vi.mock('@/hooks/use-reset-cooldown', () => ({
  useResetCooldown: () => ({
    isCoolingDown: false,
    secondsRemaining: 0,
    canReset: true,
    recordAttempt: vi.fn(),
    checkBeforeRequest: () => true,
  }),
  formatCooldownTime: (seconds: number) => `${seconds}s`,
}));

vi.mock('@/hooks/use-has-logs-cache', () => ({
  useHasLogsCache: () => true,
}));
vi.mock('../../components', () => ({
  SettingsSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  ActionCard: ({
    action,
    activeAction,
    error,
    isPending,
    password,
    onOpen,
    onClose,
    onPasswordChange,
    onConfirm,
  }: {
    action: string;
    activeAction: string | null;
    error: string;
    isPending: boolean;
    password: string;
    onOpen: (action: string) => void;
    onClose: () => void;
    onPasswordChange: (password: string) => void;
    onConfirm: (action: string) => Promise<void>;
  }) => (
    <div>
      {activeAction === action ? (
        <div>
          <input
            type="password"
            aria-label={
              action === 'export'
                ? 'settings.export_confirm_password'
                : 'settings.delete_confirm_password'
            }
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          {error && <div data-testid={`settings-${action}-error`}>{error}</div>}
          <button onClick={() => onConfirm(action)} disabled={isPending || !password}>
            {action === 'export' ? 'settings.export_confirm_btn' : 'common.confirm'}
          </button>
          <button onClick={onClose} disabled={isPending}>
            common.cancel
          </button>
        </div>
      ) : (
        <button
          data-testid={action === 'export' ? 'export-data-button' : `reset-${action}-button`}
          onClick={() => onOpen(action)}
        >
          {action}
        </button>
      )}
    </div>
  ),
}));

describe('DataManagementSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderSection() {
    render(<DataManagementSection />);
  }

  it('shows workflow errors for export instead of only auth errors', async () => {
    mockVerifyPassword.mockResolvedValue(undefined);
    mockExportData.mockRejectedValue(new Error('common.task_failed'));

    renderSection();

    fireEvent.click(screen.getByTestId('export-data-button'));
    fireEvent.change(screen.getByLabelText('settings.export_confirm_password'), {
      target: { value: 'CorrectPassword1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'settings.export_confirm_btn' }));

    await waitFor(() => {
      expect(screen.getByTestId('settings-export-error')).toHaveTextContent('common.task_failed');
    });
  });

  it('starts the prayer reset after password verification', async () => {
    mockVerifyPassword.mockResolvedValue(undefined);
    mockResetPrayerLogs.mockResolvedValue({ jobId: 'job-1' });

    renderSection();

    fireEvent.click(screen.getByTestId('reset-prayers-button'));
    fireEvent.change(screen.getByLabelText('settings.delete_confirm_password'), {
      target: { value: 'CorrectPassword1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    await waitFor(() => {
      expect(mockVerifyPassword).toHaveBeenCalledWith('test@example.com', 'CorrectPassword1!');
    });
    expect(mockResetPrayerLogs).toHaveBeenCalledTimes(1);
  });
});
