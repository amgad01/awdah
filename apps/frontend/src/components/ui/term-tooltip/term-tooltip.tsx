import React, { useState, useId, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '@/hooks/use-language';
import { getGlossaryEntry, resolveGlossaryText } from '@/content/glossary/glossary';
import styles from './term-tooltip.module.css';

interface TermTooltipProps {
  /**
   * A glossary key defined in src/content/glossary/glossary.ts.
   * Any string is accepted: if no entry is found, the children are
   * rendered as plain text with no badge or tooltip.
   */
  termId: string;
  children: React.ReactNode;
}

/**
 * Wraps a word or phrase and shows a glossary tooltip on hover, focus, or tap.
 * Content comes from src/content/glossary/glossary.ts so adding a new term
 * requires no changes here: just add an entry to the glossary file.
 *
 * If the term has no glossary entry, or the active language has no synonyms
 * or definition defined (and there is no English fallback), the children are
 * rendered as plain, unstyled text.
 *
 * Usage:
 *   <TermTooltip termId="bulugh">Bulugh</TermTooltip>
 *   <TermTooltip termId="qadaa">missed prayers</TermTooltip>
 */
export const TermTooltip: React.FC<TermTooltipProps> = ({ termId, children }) => {
  const { language, isRTL } = useLanguage();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [flip, setFlip] = useState<'up' | 'down'>('down');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchToggleRef = useRef(false);

  const computeAndOpen = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const maxWidth = Math.min(300, window.innerWidth - 16);
      const estimatedHeight = 160;
      const style: React.CSSProperties = {
        position: 'fixed',
        maxWidth,
        zIndex: 9999,
      };

      let direction: 'up' | 'down';
      if (rect.top > estimatedHeight + 16) {
        style.bottom = window.innerHeight - rect.top + 8;
        direction = 'down';
      } else {
        style.top = Math.min(window.innerHeight - 8, rect.bottom + 8);
        direction = 'up';
      }

      if (isRTL) {
        // Align tooltip's right edge with trigger's right edge
        style.right = window.innerWidth - rect.right;
      } else {
        // Align tooltip's left edge with trigger's left edge, clamped to viewport
        style.left = Math.max(8, Math.min(rect.left, window.innerWidth - maxWidth - 8));
      }
      setTooltipStyle(style);
      setFlip(direction);
    }
    setOpen(true);
  }, [isRTL]);

  const entry = getGlossaryEntry(termId);
  const synonyms = entry ? resolveGlossaryText(entry.synonyms, language) : undefined;
  const definition = entry ? resolveGlossaryText(entry.definition, language) : undefined;

  // No content available: render children as plain text, no tooltip, no badge
  if (!entry || (!synonyms && !definition)) {
    return <>{children}</>;
  }

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={computeAndOpen}
      onMouseLeave={() => setOpen(false)}
      onFocus={computeAndOpen}
      onBlur={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-describedby={id}
        aria-label={`${typeof children === 'string' ? children : termId}: tap for definition`}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
            return;
          }

          event.preventDefault();
          touchToggleRef.current = true;

          if (open) {
            setOpen(false);
            return;
          }

          computeAndOpen();
        }}
        onClick={() => {
          if (touchToggleRef.current) {
            touchToggleRef.current = false;
            return;
          }

          if (!open) computeAndOpen();
          else setOpen(false);
        }}
      >
        {children}
        <span className={styles.icon} aria-hidden="true">
          ?
        </span>
      </button>

      {open &&
        ReactDOM.createPortal(
          <span
            id={id}
            role="tooltip"
            className={styles.tooltip}
            dir={isRTL ? 'rtl' : 'ltr'}
            data-flip={flip}
            style={tooltipStyle}
          >
            {entry.arabic && <span className={styles.arabic}>{entry.arabic}</span>}
            {synonyms && <span className={styles.synonyms}>{synonyms}</span>}
            {definition && <span className={styles.definition}>{definition}</span>}
          </span>,
          document.body,
        )}
    </span>
  );
};
