import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { glossary, resolveGlossaryText } from '@/content/glossary/glossary';
import faqData from '@/content/faq/faq-data.json';
import styles from './learn-page.module.css';

interface FaqItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

interface FaqSection {
  id: string;
  titleKey: string;
  items: FaqItem[];
}

interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ question, answer, isOpen, onToggle }) => (
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

export const LearnPage: React.FC<LearnPageProps> = ({ showHeading = true }) => {
  const { t, language } = useLanguage();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const handleToggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const normalizedQuery = query.trim().toLowerCase();

  const sections = useMemo(() => {
    return (faqData as FaqSection[])
      .map((section) => {
        const title = t(section.titleKey);
        const items = section.items
          .map((item) => ({
            ...item,
            question: t(item.questionKey),
            answer: t(item.answerKey),
          }))
          .filter((item) => {
            if (!normalizedQuery) return true;

            return [title, item.question, item.answer].some((value) =>
              value.toLowerCase().includes(normalizedQuery),
            );
          });

        return {
          ...section,
          title,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [normalizedQuery, t]);

  const glossaryEntries = useMemo(() => {
    return Object.entries(glossary)
      .map(([termId, entry]) => {
        const synonyms = resolveGlossaryText(entry.synonyms, language);
        const definition = resolveGlossaryText(entry.definition, language);

        return {
          termId,
          arabic: entry.arabic,
          synonyms,
          definition,
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

      {!hasResults ? (
        <Card variant="outline" className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>{t('learn.no_results_title')}</h2>
          <p className={styles.emptyText}>{t('learn.no_results_hint')}</p>
        </Card>
      ) : (
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
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className={styles.footer}>
        <p className={styles.footerNote}>{t('learn.footer_note')}</p>
      </footer>
    </div>
  );
};
