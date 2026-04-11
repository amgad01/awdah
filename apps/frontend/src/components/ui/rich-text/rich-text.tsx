import React from 'react';

interface RichTextProps {
  children: string;
  className?: string;
  paragraphClassName?: string;
  renderText?: (text: string) => React.ReactNode;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitBoldSegments(text: string): string[] {
  return text.split(/(\*\*.+?\*\*)/g).filter(Boolean);
}

export const RichText: React.FC<RichTextProps> = ({
  children,
  className,
  paragraphClassName,
  renderText,
}) => {
  const paragraphs = splitParagraphs(children);

  if (paragraphs.length === 0) {
    return null;
  }

  const renderPlainText = renderText ?? ((text: string) => text);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={`rich-text-paragraph-${paragraphIndex}`} className={paragraphClassName}>
          {splitBoldSegments(paragraph).map((segment, segmentIndex) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
              return (
                <strong key={`rich-text-bold-${paragraphIndex}-${segmentIndex}`}>
                  {segment.slice(2, -2)}
                </strong>
              );
            }

            return (
              <React.Fragment key={`rich-text-text-${paragraphIndex}-${segmentIndex}`}>
                {renderPlainText(segment)}
              </React.Fragment>
            );
          })}
        </p>
      ))}
    </div>
  );
};
