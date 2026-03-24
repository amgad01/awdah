/**
 * GlossaryText — auto-annotates a translated string with glossary tooltips.
 *
 * Any glossary term found in the text is automatically wrapped with a
 * TermTooltip. Detection is driven entirely by glossary.json — adding or
 * editing a term there is the only change needed; this component never needs
 * to know about specific terms.
 *
 * Detection rules:
 *   - Latin term keys: whole-word match, case-insensitive  (e.g. "Bulugh")
 *   - Arabic values:   exact string match                  (e.g. "البلوغ")
 *
 * If no glossary terms are present, the text renders as plain text with zero
 * overhead. If the TermTooltip itself has no content for the active language
 * it also suppresses gracefully, so this component is always safe to use.
 *
 * Usage:
 *   <GlossaryText>{t('learn.faq.answer')}</GlossaryText>
 *   <GlossaryText>{t('onboarding.hint')}</GlossaryText>
 */

import React from 'react';
import glossaryJson from '@/content/glossary/glossary.json';
import { TermTooltip } from './term-tooltip';

// ---------------------------------------------------------------------------
// Module-level setup — runs once at import time, never on each render
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Flat map: normalised trigger string → termId.
 * Latin keys are lowercased; Arabic values are stored as-is.
 */
const triggerMap = new Map<string, string>();

for (const [termId, entry] of Object.entries(glossaryJson)) {
  triggerMap.set(termId.toLowerCase(), termId);
  if (entry.arabic) {
    triggerMap.set(entry.arabic, termId);
  }
}

// Separate Latin and Arabic triggers — they need different boundary rules
const latinParts: string[] = [];
const arabicParts: string[] = [];

for (const trigger of triggerMap.keys()) {
  if (/[\u0600-\u06FF]/.test(trigger)) {
    // Append Arabic letter suffix so the pattern captures the whole word,
    // e.g. "الهجري" matches "الهجرية" in full rather than as a partial highlight.
    arabicParts.push(escapeRegex(trigger) + '[\\u0600-\\u06FF\\u0640]*');
  } else {
    latinParts.push(escapeRegex(trigger));
  }
}

// Longest-first so a longer match wins over a shorter prefix
latinParts.sort((a, b) => b.length - a.length);
arabicParts.sort((a, b) => b.length - a.length);

const regexParts: string[] = [];
if (latinParts.length > 0) regexParts.push(`\\b(?:${latinParts.join('|')})\\b`);
// No word boundary markers needed — each Arabic part already extends to the end of the
// inflected word via the [Arabic-letter]* suffix, so it greedily consumes the full word.
if (arabicParts.length > 0) regexParts.push(`(?:${arabicParts.join('|')})`);

// null only if the glossary is somehow empty — handled gracefully below
const TERM_PATTERN = regexParts.length > 0 ? new RegExp(regexParts.join('|'), 'gi') : null;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

interface Token {
  text: string;
  termId?: string;
}

function tokenize(text: string): Token[] {
  // Local binding so TypeScript can narrow away null in the loop below
  const pattern = TERM_PATTERN;
  if (!pattern) return [{ text }];

  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index;
    if (idx === undefined) continue;

    if (idx > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, idx) });
    }

    const matched = match[0];
    // For Latin: lowercase lookup. For Arabic: the match may include inflectional suffixes
    // (e.g. "الهجرية" matched via "الهجري" root). Strip trailing Arabic characters until the
    // base form is found in the triggerMap.
    let termId = triggerMap.get(matched.toLowerCase()) ?? triggerMap.get(matched);
    if (!termId && /[\u0600-\u06FF]/.test(matched)) {
      let stripped = matched;
      while (stripped.length > 0 && !termId) {
        stripped = stripped.slice(0, -1);
        termId = triggerMap.get(stripped);
      }
    }
    tokens.push({ text: matched, termId });
    lastIndex = idx + matched.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ text }];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GlossaryText: React.FC<{ children: string }> = ({ children }) => {
  const tokens = tokenize(children);

  // Fast path — no glossary terms found
  if (!tokens.some((tok) => tok.termId !== undefined)) {
    return <>{children}</>;
  }

  return (
    <>
      {tokens.map((tok, i) =>
        tok.termId ? (
          <TermTooltip key={i} termId={tok.termId}>
            {tok.text}
          </TermTooltip>
        ) : (
          <React.Fragment key={i}>{tok.text}</React.Fragment>
        ),
      )}
    </>
  );
};
