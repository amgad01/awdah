import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnPage } from '../learn-page';

const loadLocalizedContentMock = vi.fn();

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/utils/localized-content', () => ({
  loadLocalizedContent: (...args: unknown[]) => loadLocalizedContentMock(...args),
}));

describe('LearnPage', () => {
  beforeEach(() => {
    loadLocalizedContentMock.mockReset();
  });

  it('shows FAQ references directly in the visible content', async () => {
    loadLocalizedContentMock.mockResolvedValue([
      {
        id: 'faq-section',
        title: 'FAQ section',
        items: [
          {
            id: 'faq-item',
            question: 'Question',
            answer: 'Answer',
            references: [{ label: 'Source one', url: 'https://example.com/one' }],
          },
        ],
      },
    ]);

    render(<LearnPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Source one' })).toHaveAttribute(
        'href',
        'https://example.com/one',
      );
    });
  });
});
