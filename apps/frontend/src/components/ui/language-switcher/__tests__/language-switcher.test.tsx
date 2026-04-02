import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '../language-switcher';

const mockToggleLanguage = vi.fn();
const mockSetLanguage = vi.fn();

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
    toggleLanguage: mockToggleLanguage,
    setLanguage: mockSetLanguage,
    supportedLanguages: [
      {
        code: 'en',
        shortLabel: 'EN',
        name: 'English',
        nativeName: 'English',
        dir: 'ltr',
      },
      {
        code: 'ar',
        shortLabel: 'AR',
        name: 'Arabic',
        nativeName: 'العربية',
        dir: 'rtl',
      },
    ],
  }),
}));

describe('LanguageSwitcher', () => {
  it('toggles language in compact two-language mode', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher density="compact" />);

    await user.click(screen.getByRole('button'));

    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it('renders full variant and changes language from list', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher variant="full" />);

    const arabicButton = screen.getByRole('button', { name: /العربية/i });
    await user.click(arabicButton);

    expect(mockSetLanguage).toHaveBeenCalledWith('ar');
  });
});
