import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AboutPage } from '../about-page';

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

const baseAboutData = {
  project_badge: 'Project',
  project_title: 'About Awdah',
  project_subtitle: 'Subtitle',
  why_title: 'Why',
  why_body: 'Why body',
  who_title: 'Who',
  who_body: 'Who body',
  features_title: 'Features',
  features: [],
  team_title: 'Founder',
  privacy_title: 'Privacy',
  team: [
    {
      id: 'founder-1',
      name: 'Founder Name',
      role: 'Founder',
      bio: 'First paragraph of the founder bio.\n\nSecond paragraph with more detail.',
      github: 'founder-1',
      socials: [],
      tech_title: 'Skills',
      tech: ['TypeScript'],
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );

describe('AboutPage — bio paragraph rendering', () => {
  it('renders a blank-line-separated bio as multiple paragraphs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => baseAboutData,
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('First paragraph of the founder bio.')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph with more detail.')).toBeInTheDocument();
    });

    const paragraphs = Array.from(document.querySelectorAll('p')).filter(
      (el) =>
        el.textContent === 'First paragraph of the founder bio.' ||
        el.textContent === 'Second paragraph with more detail.',
    );
    expect(paragraphs).toHaveLength(2);
  });

  it('renders a single-paragraph bio as one paragraph', async () => {
    const singleParaBio = {
      ...baseAboutData,
      team: [{ ...baseAboutData.team[0], bio: 'Only one paragraph here.' }],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => singleParaBio,
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Only one paragraph here.')).toBeInTheDocument();
    });

    const paragraphs = Array.from(document.querySelectorAll('p')).filter(
      (el) => el.textContent === 'Only one paragraph here.',
    );
    expect(paragraphs).toHaveLength(1);
  });

  it('shows an error state when the fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders feature cards including self-hosting', async () => {
    const dataWithFeatures = {
      ...baseAboutData,
      features: [
        { id: 'salah', icon: 'Moon', title: 'Salah Tracking', body: 'Track prayers' },
        { id: 'selfhost', icon: 'Server', title: 'Self-Hostable', body: 'Run locally' },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithFeatures,
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Salah Tracking')).toBeInTheDocument();
      expect(screen.getByText('Self-Hostable')).toBeInTheDocument();
      expect(screen.getByText('Run locally')).toBeInTheDocument();
    });
  });
});
