import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ReferenceLinks } from '../reference-links';

describe('ReferenceLinks', () => {
  it('renders a heading and multiple reference links', () => {
    render(
      <MemoryRouter>
        <ReferenceLinks
          heading="References"
          references={[
            { label: 'Source one', url: 'https://example.com/one' },
            { label: 'Source two', url: 'https://example.com/two' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'References' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Source one' })).toHaveAttribute(
      'href',
      'https://example.com/one',
    );
    expect(screen.getByRole('link', { name: 'Source two' })).toHaveAttribute(
      'href',
      'https://example.com/two',
    );
  });

  it('renders nothing when no references are present', () => {
    const { container } = render(
      <MemoryRouter>
        <ReferenceLinks heading="References" references={[]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders internal links without a new tab', () => {
    render(
      <MemoryRouter>
        <ReferenceLinks
          heading="References"
          compact
          references={[{ label: 'About Awdah', url: '/about' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'About Awdah' })).toHaveAttribute('href', '/about');
  });
});
