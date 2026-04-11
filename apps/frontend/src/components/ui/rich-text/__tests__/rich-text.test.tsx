import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from '../rich-text';

describe('RichText', () => {
  it('splits text into paragraphs and bold segments', () => {
    render(
      <RichText
        className="body"
        paragraphClassName="paragraph"
        renderText={(text) => <span>{text}</span>}
      >
        {'First paragraph with **bold text**.\n\nSecond paragraph.'}
      </RichText>,
    );

    expect(document.querySelectorAll('p')).toHaveLength(2);
    expect(screen.getByText('bold text')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
  });

  it('renders nothing for empty content', () => {
    const { container } = render(<RichText>{'   '}</RichText>);

    expect(container).toBeEmptyDOMElement();
  });
});
