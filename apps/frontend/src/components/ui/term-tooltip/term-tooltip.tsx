import React, { useState, useId, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/hooks/use-language';
import { getGlossaryEntry, resolveGlossaryText } from '@/content/glossary/glossary';
import styles from './term-tooltip.module.css';

const INITIAL_TOOLTIP_STYLE: React.CSSProperties = {
  position: 'fixed',
  visibility: 'hidden',
};

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
  const descriptionId = `${id}-description`;
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState<'up' | 'down'>('down');
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>(INITIAL_TOOLTIP_STYLE);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchToggleRef = useRef(false);

  const computeAndOpen = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = 160;
      const nextFlip: 'up' | 'down' = rect.top > estimatedHeight + 16 ? 'down' : 'up';
      setFlip(nextFlip);
      const style: React.CSSProperties = { position: 'fixed' };
      if (nextFlip === 'down') {
        style.insetBlockStart = rect.bottom + 8;
        style.insetBlockEnd = 'auto';
      } else {
        style.insetBlockEnd = window.innerHeight - rect.top + 8;
        style.insetBlockStart = 'auto';
      }
      if (isRTL) {
        style.insetInlineEnd = window.innerWidth - rect.right;
        style.insetInlineStart = 'auto';
      } else {
        style.insetInlineStart = rect.left;
        style.insetInlineEnd = 'auto';
      }
      setTooltipStyle(style);
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
    <>
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
          aria-describedby={descriptionId}
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
        <span id={descriptionId} className={styles.srOnly}>
          {entry.arabic ? `${entry.arabic}. ` : ''}
          {synonyms ? `${synonyms}. ` : ''}
          {definition ?? ''}
        </span>
      </span>

      {open &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            aria-hidden="true"
            className={`${styles.tooltip} ${flip === 'up' ? styles.tooltipUp : styles.tooltipDown} ${
              isRTL ? styles.tooltipRtl : styles.tooltipLtr
            }`}
            style={tooltipStyle}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {entry.arabic && <span className={styles.arabic}>{entry.arabic}</span>}
            {synonyms && <span className={styles.synonyms}>{synonyms}</span>}
            {definition && <span className={styles.definition}>{definition}</span>}
          </span>,
          document.body,
        )}
    </>
  );
};
