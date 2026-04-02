import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { BulughStep } from '../bulugh-step';

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
    fmtNumber: (n: number) => String(n),
  }),
}));

vi.mock('@/components/ui/term-tooltip', () => ({
  TermTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/hijri-date-picker/hijri-date-picker', () => ({
  HijriDatePicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}));

function BulughHarness() {
  const [state, setState] = React.useState({
    bulughDateHijri: '1445-01-01',
    revertDateHijri: '',
  });

  return (
    <BulughStep
      dateOfBirthHijri="1430-01-01"
      bulughDateHijri={state.bulughDateHijri}
      revertDateHijri={state.revertDateHijri || undefined}
      onChange={(updates) =>
        setState((current) => ({
          bulughDateHijri: updates.bulughDateHijri ?? current.bulughDateHijri,
          revertDateHijri: updates.revertDateHijri ?? '',
        }))
      }
    />
  );
}

describe('BulughStep', () => {
  it('keeps age mode active after parent state sync', async () => {
    const user = userEvent.setup();

    render(<BulughHarness />);

    await user.click(screen.getByRole('button', { name: 'onboarding.bulugh_mode_age' }));

    expect(screen.getByLabelText('onboarding.bulugh_age_label')).toBeInTheDocument();
  });

  it('applies unsure default mode and keeps progressing data available', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<BulughStep dateOfBirthHijri="1430-01-01" bulughDateHijri="" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'onboarding.bulugh_mode_default' }));

    expect(onChange).toHaveBeenCalledWith({
      bulughDateHijri: '1445-01-01',
      revertDateHijri: undefined,
    });
  });
});
