import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileFooter } from './mobile-footer';

// Mock the useLanguage hook
vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.demo': 'Demo',
        'nav.about': 'About',
        'nav.contributing': 'Contribute',
        'nav.privacy': 'Privacy',
      };
      return translations[key] || key;
    },
  }),
}));

describe('MobileFooter', () => {
  it('renders all navigation links', () => {
    render(
      <MemoryRouter>
        <MobileFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Contribute')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('links to correct paths', () => {
    render(
      <MemoryRouter>
        <MobileFooter />
      </MemoryRouter>,
    );

    const demoLink = screen.getByText('Demo').closest('a');
    const aboutLink = screen.getByText('About').closest('a');
    const contributeLink = screen.getByText('Contribute').closest('a');
    const privacyLink = screen.getByText('Privacy').closest('a');

    expect(demoLink).toHaveAttribute('href', '/demo');
    expect(aboutLink).toHaveAttribute('href', '/about');
    expect(contributeLink).toHaveAttribute('href', '/contribute');
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('marks active link correctly', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <MobileFooter />
      </MemoryRouter>,
    );

    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders icons for each link', () => {
    const { container } = render(
      <MemoryRouter>
        <MobileFooter />
      </MemoryRouter>,
    );

    // Check that each link contains an SVG icon
    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      expect(link.querySelector('svg')).toBeInTheDocument();
    });
  });
});
