/**
 * Glossary — term definitions for the hover tooltip.
 *
 * To add or edit a term, update glossary.json in this directory — no TypeScript
 * changes needed. Each entry has:
 *   - "arabic": Arabic script (shown in every language)
 *   - "synonyms": { "en": "...", "ar": "..." }  — alternative names per language
 *   - "definition": { "en": "...", "ar": "..." }  — brief definition per language
 *
 * If a language code is missing, the component falls back to English.
 * If neither exists, the tooltip is suppressed and the text renders as plain text.
 *
 * Use the JSON key as `termId` on any <TermTooltip termId="yourKey"> in the UI.
 */

import glossaryJson from './glossary.json';

export interface GlossaryEntry {
  /** Arabic script for the term — displayed in every language */
  arabic: string;
  /** Short synonyms / alternative names, keyed by language code */
  synonyms: Partial<Record<string, string>>;
  /** Brief plain-language definition, keyed by language code */
  definition: Partial<Record<string, string>>;
}

export const glossary: Record<string, GlossaryEntry> = glossaryJson as Record<
  string,
  GlossaryEntry
>;

/**
 * Returns the glossary entry for a given term ID, or undefined if the term
 * is not in the glossary. The TermTooltip component uses this to decide
 * whether to show a tooltip at all.
 */
export function getGlossaryEntry(termId: string): GlossaryEntry | undefined {
  return glossary[termId];
}

/**
 * Resolves the best available text for a given field and language code.
 * Falls back to English, then to undefined if neither exists.
 */
export function resolveGlossaryText(
  field: Partial<Record<string, string>>,
  language: string,
): string | undefined {
  return field[language] ?? field['en'];
}
