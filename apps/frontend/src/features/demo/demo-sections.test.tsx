import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DemoData } from './demo-types';
import { DemoHeroSection } from './demo-sections';

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
  }),
}));

describe('DemoHeroSection', () => {
  it('renders glossary-enabled demo story text', () => {
    const data = {
      salah: {
        completed: 42,
        streakDays: 5,
      },
      sawm: {
        completed: 7,
      },
    } as DemoData;

    render(
      <DemoHeroSection
        data={data}
        fmtNumber={(value) => String(value)}
        localizedStory="Maryam logs qadaa consistently to stay organised."
        showHeading
        t={(key, options) => {
          if (key === 'dashboard.hero_focus_body') {
            return `Focus body ${String(options?.prayers ?? '')} ${String(options?.fasts ?? '')}`;
          }

          return key;
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /qadaa/i })).toBeInTheDocument();
  });
});
