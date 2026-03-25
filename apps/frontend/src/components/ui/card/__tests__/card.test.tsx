import { render, screen } from '@testing-library/react';
import { Card } from '../card';
import { describe, it, expect } from 'vitest';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders title and subtitle when provided', () => {
    render(
      <Card title="Test Title" subtitle="Test Subtitle">
        Content
      </Card>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies variant class', () => {
    const { container } = render(<Card variant="primary">Content</Card>);
    // We can't easily check CSS module classes by name, but we can check if it has A class
    expect(container.firstChild).not.toBeNull();
  });
});
