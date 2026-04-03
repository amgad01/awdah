import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  CheckSquare,
  Clock,
  Globe,
  Github,
  HelpCircle,
  Heart,
  Languages,
  Linkedin,
  Monitor,
  Moon,
  Palette,
  Server,
  Star,
  Wifi,
} from 'lucide-react';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { useLanguage } from '@/hooks/use-language';
import { loadLocalizedContent } from '@/utils/localized-content';
import styles from './contributing-page.module.css';

interface ContributingItem {
  id: string;
  title: string;
  description: string;
  steps?: string[];
}

interface ContributingSection {
  id: string;
  badge: string;
  badge_variant: 'accent' | 'primary' | 'success' | 'info';
  icon: string;
  title: string;
  body: string;
  items: ContributingItem[];
}

interface PRStep {
  step: number;
  title: string;
  body: string;
}

interface V2Item {
  id: string;
  icon: string;
  title: string;
  body: string;
}

interface ContributingData {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  oss_note: string;
  github_link: string;
  github_link_label: string;
  contact_link: string;
  contact_label: string;
  sections: ContributingSection[];
  pr_title: string;
  pr_intro: string;
  pr_steps: PRStep[];
  v2_badge: string;
  v2_title: string;
  v2_intro: string;
  v2_items: V2Item[];
  recognition_title: string;
  recognition_body: string;
  recognition_cta: string;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const badgeVariantClass: Record<ContributingSection['badge_variant'], string> = {
  accent: styles.badgeAccent,
  primary: styles.badgePrimary,
  success: styles.badgeSuccess,
  info: styles.badgeInfo,
};

const CONTRIBUTION_ICONS: Record<string, IconComponent> = {
  BookOpen,
  Monitor,
  Server,
  Globe,
  Languages,
  Palette,
  Calculator,
};

const ROADMAP_ICONS: Record<string, IconComponent> = {
  BookOpen,
  Bell,
  Wifi,
  Moon,
  Languages,
  CheckSquare,
  Clock,
  Star,
};

export const ContributingPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [data, setData] = useState<ContributingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const json = await loadLocalizedContent<ContributingData>('contributing', language, {
          signal: controller.signal,
        });
        if (!cancelled) {
          setData(json);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : t('common.error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [language, refreshKey, t]);

  if (error) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <span className={styles.heroBadge}>{t('contributing.project_badge')}</span>
          <h1 className={styles.heroTitle}>{t('contributing.project_title')}</h1>
        </section>
        <div style={{ marginTop: '2rem' }}>
          <button
            type="button"
            className={styles.ctaButton}
            onClick={() => setRefreshKey((v) => v + 1)}
          >
            {t('common.retry')}
          </button>
          <p className={styles.sectionBody} style={{ marginTop: '1rem' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <span className={styles.heroBadge}>{data.hero_badge}</span>
        <h1 className={styles.heroTitle}>{data.hero_title}</h1>
        <p className={styles.heroSubtitle}>
          <GlossaryText>{data.hero_subtitle}</GlossaryText>
        </p>

        <div className={styles.ossNote}>
          <GlossaryText>{data.oss_note}</GlossaryText>
        </div>

        <div className={styles.ctaLinks}>
          <a
            href={data.github_link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButton}
          >
            <Github size={18} />
            <span>{data.github_link_label}</span>
          </a>
          <a
            href={data.contact_link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButtonSecondary}
          >
            <Linkedin size={18} />
            <span>{data.contact_label}</span>
          </a>
        </div>
      </section>

      {/* ── Contribution Areas ── */}
      {data.sections.map((section) => {
        const IconComponent = CONTRIBUTION_ICONS[section.icon] ?? HelpCircle;

        return (
          <section key={section.id} className={styles.contributionSection}>
            <div className={styles.sectionHeader}>
              <span className={`${styles.badge} ${badgeVariantClass[section.badge_variant]}`}>
                {section.badge}
              </span>
              <div className={styles.sectionTitleRow}>
                <IconComponent size={22} className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              </div>
              <p className={styles.sectionBody}>
                <GlossaryText>{section.body}</GlossaryText>
              </p>
            </div>

            <div className={styles.itemList}>
              {section.items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <p className={styles.itemDescription}>
                    <GlossaryText>{item.description}</GlossaryText>
                  </p>
                  {item.steps && item.steps.length > 0 && (
                    <ol className={styles.stepList}>
                      {item.steps.map((step, i) => (
                        <li key={i} className={styles.stepItem}>
                          <span className={styles.stepNumber}>{i + 1}</span>
                          <span className={styles.stepText}>
                            <GlossaryText>{step}</GlossaryText>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* ── How to Submit a PR ── */}
      <section className={styles.prSection}>
        <h2 className={styles.sectionTitle}>{data.pr_title}</h2>
        <p className={styles.sectionBody}>
          <GlossaryText>{data.pr_intro}</GlossaryText>
        </p>

        <ol className={styles.prStepList}>
          {data.pr_steps.map((step) => (
            <li key={step.step} className={styles.prStep}>
              <span className={styles.prStepNumber}>{step.step}</span>
              <div className={styles.prStepContent}>
                <h3 className={styles.prStepTitle}>{step.title}</h3>
                <p className={styles.prStepBody}>
                  <GlossaryText>{step.body}</GlossaryText>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── v2 Roadmap ── */}
      <section className={styles.v2Section}>
        <span className={`${styles.badge} ${styles.badgePrimary}`}>{data.v2_badge}</span>
        <h2 className={styles.sectionTitle}>{data.v2_title}</h2>
        <p className={styles.sectionBody}>
          <GlossaryText>{data.v2_intro}</GlossaryText>
        </p>

        <div className={styles.v2Grid}>
          {data.v2_items.map((item) => {
            const IconComponent = ROADMAP_ICONS[item.icon] ?? HelpCircle;
            return (
              <div key={item.id} className={styles.v2Card}>
                <IconComponent size={20} className={styles.v2CardIcon} />
                <h3 className={styles.v2CardTitle}>{item.title}</h3>
                <p className={styles.v2CardBody}>
                  <GlossaryText>{item.body}</GlossaryText>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Recognition ── */}
      <section className={styles.recognitionSection}>
        <Heart size={24} className={styles.recognitionIcon} />
        <h2 className={styles.recognitionTitle}>{data.recognition_title}</h2>
        <p className={styles.recognitionBody}>
          <GlossaryText>{data.recognition_body}</GlossaryText>
        </p>
        <a
          href={data.github_link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaButton}
        >
          <Github size={18} />
          <span>{data.recognition_cta}</span>
        </a>
      </section>
    </div>
  );
};
