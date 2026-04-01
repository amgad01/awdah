import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card/card';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { glossary, resolveGlossaryText } from '@/content/glossary/glossary';
import styles from './learn-page.module.css';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqSection {
  id: string;
  title: string;
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
  const [faqData, setFaqData] = useState<FaqSection[] | null>(null);
  const [faqLoadedLanguage, setFaqLoadedLanguage] = useState<string | null>(null);
  const [faqError, setFaqError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const url = `${import.meta.env.BASE_URL}data/faq-${language}.json`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load FAQ content');
        }
        return (await res.json()) as FaqSection[];
      })
      .then((json) => {
        setFaqData(Array.isArray(json) ? json : []);
        setFaqLoadedLanguage(language);
        setFaqError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setFaqData([]);
        setFaqLoadedLanguage(language);
        setFaqError(true);
      });

    return () => controller.abort();
  }, [language, reloadKey]);

  const handleToggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const faqLoading = faqLoadedLanguage !== language && !faqError;
  const activeFaqData = useMemo(
    () => (faqLoadedLanguage === language ? (faqData ?? []) : []),
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
  const showFaqErrorState = faqError;
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
              setFaqData(null);
              setFaqLoadedLanguage(null);
              setFaqError(false);
              setReloadKey((value) => value + 1);
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
      ) : null}

      <footer className={styles.footer}>
        <p className={styles.footerNote}>{t('learn.footer_note')}</p>
      </footer>
    </div>
  );
};
