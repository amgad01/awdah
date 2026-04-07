import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '../language-switcher';

const mockToggleLanguage = vi.fn();
const mockSetLanguage = vi.fn();
const supportedLanguages = [
  {
    code: 'en',
    shortLabel: 'EN',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr' as const,
  },
  {
    code: 'ar',
    shortLabel: 'AR',
    name: 'Arabic',
    nativeName: 'العربية',
    dir: 'rtl' as const,
  },
  {
    code: 'de',
    shortLabel: 'DE',
    name: 'German',
    nativeName: 'Deutsch',
    dir: 'ltr' as const,
  },
];

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
    toggleLanguage: mockToggleLanguage,
    setLanguage: mockSetLanguage,
    supportedLanguages,
  }),
}));

describe('LanguageSwitcher', () => {
  it('toggles language in compact two-language mode', async () => {
    const user = userEvent.setup();
    supportedLanguages.splice(2);
    render(<LanguageSwitcher density="compact" />);

    await user.click(screen.getByRole('button'));

    expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it('renders full variant and changes language from list', async () => {
    const user = userEvent.setup();
    supportedLanguages.splice(
      0,
      supportedLanguages.length,
      {
        code: 'en',
        shortLabel: 'EN',
        name: 'English',
        nativeName: 'English',
        dir: 'ltr' as const,
      },
      {
        code: 'ar',
        shortLabel: 'AR',
        name: 'Arabic',
        nativeName: 'العربية',
        dir: 'rtl' as const,
      },
      {
        code: 'de',
        shortLabel: 'DE',
        name: 'German',
        nativeName: 'Deutsch',
        dir: 'ltr' as const,
      },
    );
    render(<LanguageSwitcher variant="full" />);

    const arabicButton = screen.getByRole('button', { name: /العربية/i });
    await user.click(arabicButton);

    expect(mockSetLanguage).toHaveBeenCalledWith('ar');
  });
});
