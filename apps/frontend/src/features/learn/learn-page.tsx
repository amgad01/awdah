import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { useLocalizedContent } from '@/hooks/use-localized-content';
import { GlossaryText } from '@/components/ui/term-tooltip';
import {
  glossary,
  resolveGlossaryReferences,
  resolveGlossaryText,
} from '@/content/glossary/glossary';
import { ReferenceLinks } from '@/components/ui/reference-links/reference-links';
import type { ReferenceLink } from '@/content/references/reference-links';
import styles from './learn-page.module.css';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  references?: ReferenceLink[];
}

interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

interface AccordionItemProps {
  question: string;
  answer: string;
  references?: ReferenceLink[];
  referenceHeading: string;
  isOpen: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  question,
  answer,
  references = [],
  referenceHeading,
  isOpen,
  onToggle,
}) => (
  <div className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}>
    <button
      type="button"
      className={styles.accordionTrigger}
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span className={styles.accordionQuestion}>
        <GlossaryText>{question}</GlossaryText>
      </span>
      <ChevronDown
        size={18}
        className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ''}`}
        aria-hidden="true"
      />
    </button>
    <ReferenceLinks
      heading={referenceHeading}
      references={references}
      className={styles.referenceBlock}
      compact
    />
    {isOpen && (
      <div className={styles.accordionBody} role="region">
        <p className={styles.accordionAnswer}>
          <GlossaryText>{answer}</GlossaryText>
        </p>
      </div>
    )}
  </div>
);

interface LearnPageProps {
  showHeading?: boolean;
}

interface GlossaryCardEntry {
  termId: string;
  arabic: string;
  synonyms?: string;
  definition?: string;
  references: ReferenceLink[];
}

export const LearnPage: React.FC<LearnPageProps> = ({ showHeading = true }) => {
  const { t, language } = useLanguage();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const {
    data: faqData,
    error: faqError,
    loadedLanguage: faqLoadedLanguage,
    loading: faqLoading,
    reload,
  } = useLocalizedContent<FaqSection[]>('faq', language);

  const handleToggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const activeFaqData = useMemo(
    () => (faqLoadedLanguage === language ? (Array.isArray(faqData) ? faqData : []) : []),
    [faqData, faqLoadedLanguage, language],
  );

  const sections = useMemo(() => {
    return activeFaqData
      .map((section) => {
        const items = section.items.filter((item) => {
          if (!normalizedQuery) return true;
          return [section.title, item.question, item.answer].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          );
        });
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
  }, [activeFaqData, normalizedQuery]);

  const glossaryEntries = useMemo<GlossaryCardEntry[]>(() => {
    return Object.entries(glossary)
      .map(([termId, entry]) => {
        const synonyms = resolveGlossaryText(entry.synonyms, language);
        const definition = resolveGlossaryText(entry.definition, language);
        const references = resolveGlossaryReferences(entry.references, language);

        return {
          termId,
          arabic: entry.arabic,
          synonyms,
          definition,
          references,
        };
      })
      .filter((entry) => {
        if (!normalizedQuery) return true;

        return [entry.termId, entry.arabic, entry.synonyms, entry.definition]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      });
  }, [language, normalizedQuery]);

  const hasResults = sections.length > 0 || glossaryEntries.length > 0;
  const showFaqErrorState = faqError !== null;
  const showNoResultsState = !faqLoading && !showFaqErrorState && !hasResults;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {showHeading ? (
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>{t('learn.title')}</h1>
            <p className={styles.subtitle}>{t('learn.subtitle')}</p>
          </div>
        ) : null}

        <label className={styles.searchField}>
          <span className={styles.searchLabel}>{t('learn.search_label')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={styles.searchInput}
            placeholder={t('learn.search_placeholder')}
          />
        </label>

        {sections.length > 0 ? (
          <nav className={styles.sectionNav} aria-label={t('learn.section_nav_label')}>
            {sections.map((section) => (
              <a key={section.id} href={`#section-${section.id}`} className={styles.sectionPill}>
                {section.title}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {faqLoading ? (
        <Card variant="outline" className={styles.statusCard}>
          <h2 className={styles.emptyTitle}>{t('common.loading')}</h2>
          <p className={styles.emptyText}>{t('learn.loading_hint')}</p>
        </Card>
      ) : null}

      {showFaqErrorState ? (
        <Card variant="outline" className={styles.statusCard}>
          <h2 className={styles.emptyTitle}>{t('learn.load_error_title')}</h2>
          <p className={styles.emptyText}>{t('learn.load_error_body')}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              reload();
            }}
          >
            {t('common.retry')}
          </button>
        </Card>
      ) : null}

      {showNoResultsState ? (
        <Card variant="outline" className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>{t('learn.no_results_title')}</h2>
          <p className={styles.emptyText}>{t('learn.no_results_hint')}</p>
        </Card>
      ) : !faqLoading ? (
        <>
          <div className={styles.sections}>
            {sections.map((section) => (
              <Card key={section.id} className={styles.sectionCard} id={`section-${section.id}`}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <div className={styles.accordion}>
                  {section.items.map((item) => (
                    <AccordionItem
                      key={item.id}
                      question={item.question}
                      answer={item.answer}
                      references={item.references}
                      referenceHeading={t('common.references')}
                      isOpen={openKey === item.id}
                      onToggle={() => handleToggle(item.id)}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <section className={styles.glossarySection}>
            <div className={styles.glossaryHeader}>
              <h2 className={styles.glossaryTitle}>{t('learn.glossary_title')}</h2>
              <p className={styles.glossarySubtitle}>{t('learn.glossary_subtitle')}</p>
            </div>

            <div className={styles.glossaryGrid}>
              {glossaryEntries.map((entry) => (
                <Card key={entry.termId} className={styles.glossaryCard}>
                  <div className={styles.glossaryCardHeader}>
                    <span className={styles.glossaryTerm}>{entry.termId}</span>
                    <span className={styles.glossaryArabic}>{entry.arabic}</span>
                  </div>

                  {entry.synonyms ? (
                    <p className={styles.glossarySynonyms}>{entry.synonyms}</p>
                  ) : null}

                  {entry.definition ? (
                    <p className={styles.glossaryDefinition}>
                      <GlossaryText>{entry.definition}</GlossaryText>
                    </p>
                  ) : null}

                  <ReferenceLinks
                    heading={t('common.references')}
                    references={entry.references}
                    className={styles.glossaryReferences}
                  />
                </Card>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <footer className={styles.footer}>
        <p className={styles.footerNote}>{t('learn.footer_note')}</p>
      </footer>
    </div>
  );
};
