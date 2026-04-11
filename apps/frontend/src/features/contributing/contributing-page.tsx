import React, { useMemo } from 'react';
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
import { RichText } from '@/components/ui/rich-text';
import { SwiperSections } from '@/components/ui/swiper-sections';
import { useLocalizedContent } from '@/hooks/use-localized-content';
import { useLanguage } from '@/hooks/use-language';
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
  areas_title: string;
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

const renderContributionItemCard = (
  section: ContributingSection,
  item: ContributingItem,
  contactLink: string,
  contactLabel: string,
): React.JSX.Element => {
  const IconComponent = CONTRIBUTION_ICONS[section.icon] ?? HelpCircle;
  const appEmail = import.meta.env.VITE_APP_EMAIL;

  return (
    <section className={styles.contributionSection}>
      <div className={styles.sectionHeader}>
        <span className={`${styles.badge} ${badgeVariantClass[section.badge_variant]}`}>
          {section.badge}
        </span>
        <div className={styles.sectionTitleRow}>
          <IconComponent size={22} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>{section.title}</h2>
        </div>
        <RichText
          className={styles.sectionBody}
          paragraphClassName={styles.sectionBodyParagraph}
          renderText={(segment) => <GlossaryText>{segment}</GlossaryText>}
        >
          {section.body}
        </RichText>
        {section.id === 'scholars' ? (
          <div className={styles.sectionLinks}>
            <a
              href={contactLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sectionLink}
              title={contactLink}
              aria-label={`${contactLabel}: ${contactLink}`}
            >
              <Linkedin size={16} />
              <span>{contactLabel}</span>
            </a>
            {appEmail ? (
              <a
                href={`mailto:${appEmail}`}
                className={styles.sectionLink}
                title={appEmail}
                aria-label={`App email: ${appEmail}`}
              >
                <span>{appEmail}</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.itemCard}>
        <h3 className={styles.itemTitle}>{item.title}</h3>
        <p className={styles.itemDescription}>
          <GlossaryText>{item.description}</GlossaryText>
        </p>
        {item.steps && item.steps.length > 0 && (
          <ol className={styles.stepList}>
            {item.steps.map((step, index) => (
              <li key={`${item.id}-${step}`} className={styles.stepItem}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span className={styles.stepText}>
                  <GlossaryText>{step}</GlossaryText>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

const renderRoadmapCard = (item: V2Item, key?: string): React.JSX.Element => {
  const IconComponent = ROADMAP_ICONS[item.icon] ?? HelpCircle;

  return (
    <section key={key ?? item.id} className={styles.v2Card}>
      <IconComponent size={24} className={styles.v2CardIcon} />
      <h3 className={styles.v2CardTitle}>{item.title}</h3>
      <p className={styles.v2CardBody}>
        <GlossaryText>{item.body}</GlossaryText>
      </p>
    </section>
  );
};

const renderPrStepCard = (step: PRStep): React.JSX.Element => (
  <section className={styles.prMobileCard}>
    <span className={styles.prMobileStep}>{step.step}</span>
    <h3 className={styles.prMobileTitle}>{step.title}</h3>
    <p className={styles.prMobileBody}>
      <GlossaryText>{step.body}</GlossaryText>
    </p>
  </section>
);

export const ContributingPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { data, error, loadedLanguage, loading, reload } = useLocalizedContent<ContributingData>(
    'contributing',
    language,
  );

  // Prepare contribution and roadmap sections for mobile slider
  const mobileV1Sections = useMemo(() => {
    if (!data) return [];

    return data.sections.flatMap((section) =>
      section.items.map((item) => ({
        id: `${language}-section-${section.id}-${item.id}`,
        content: renderContributionItemCard(section, item, data.contact_link, data.contact_label),
      })),
    );
  }, [data, language]);

  const mobilePrSections = useMemo(() => {
    if (!data) return [];

    return data.pr_steps.map((step) => ({
      id: `${language}-pr-step-${step.step}`,
      content: renderPrStepCard(step),
    }));
  }, [data, language]);

  const mobileV2Sections = useMemo(() => {
    if (!data) return [];

    return data.v2_items.map((item) => ({
      id: `${language}-roadmap-${item.id}`,
      content: renderRoadmapCard(item),
    }));
  }, [data, language]);

  if (error) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <span className={styles.heroBadge}>{t('contributing.project_badge')}</span>
          <h1 className={styles.heroTitle}>{t('contributing.project_title')}</h1>
        </section>
        <div className={styles.errorActions}>
          <button type="button" className={styles.ctaButton} onClick={reload}>
            {t('common.retry')}
          </button>
          <p className={`${styles.sectionBody} ${styles.errorBody}`}>
            {error.message || t('common.error')}
          </p>
        </div>
      </div>
    );
  }

  if (loading || loadedLanguage !== language || !data) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile View - Static Hero + Slider + Static Recognition */}
      <div className={styles.mobileSwipeView} data-testid="contributing-mobile-view">
        {/* Static Hero */}
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
          </div>
        </section>

        {/* v1 Content Slider Section */}
        <div className={styles.sliderSection}>
          <h2 className={styles.sliderSectionTitle}>{data.areas_title}</h2>
          <SwiperSections
            sections={mobileV1Sections}
            className={styles.sliderSwiper}
            contentAlign="center"
          />
        </div>

        {/* How to Submit a PR - Mobile Slider */}
        <div className={styles.sliderSection}>
          <h2 className={styles.sliderSectionTitle}>{data.pr_title}</h2>
          <p className={styles.sliderIntro}>
            <GlossaryText>{data.pr_intro}</GlossaryText>
          </p>
          <SwiperSections
            sections={mobilePrSections}
            className={styles.sliderSwiper}
            contentAlign="center"
          />
        </div>

        {/* v2 Roadmap Slider */}
        <div className={styles.sliderSection}>
          <h2 className={styles.sliderSectionTitle}>{data.v2_title}</h2>
          <p className={styles.sliderIntro}>
            <GlossaryText>{data.v2_intro}</GlossaryText>
          </p>
          <SwiperSections
            sections={mobileV2Sections}
            className={styles.sliderSwiper}
            contentAlign="center"
          />
        </div>

        {/* Static Recognition Section */}
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

      {/* Desktop Scroll View */}
      <div className={styles.desktopScrollView} data-testid="contributing-desktop-view">
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

        {/* ── Contribution Areas ── Tab-slider on desktop ── */}
        <div className={styles.desktopSliderSection}>
          <h2 className={styles.desktopSliderTitle}>{data.areas_title}</h2>
          <SwiperSections
            sections={mobileV1Sections}
            className={styles.desktopSliderSwiper}
            contentAlign="center"
          />
        </div>

        {/* ── How to Submit a PR ── Tab-slider on desktop ── */}
        <div className={styles.desktopSliderSection}>
          <h2 className={styles.desktopSliderTitle}>{data.pr_title}</h2>
          <p className={styles.desktopSliderIntro}>
            <GlossaryText>{data.pr_intro}</GlossaryText>
          </p>
          <SwiperSections
            sections={mobilePrSections}
            className={styles.desktopSliderSwiper}
            contentAlign="center"
          />
        </div>

        {/* ── v2 Roadmap ── Tab-slider on desktop ── */}
        <div className={styles.desktopSliderSection}>
          <span className={`${styles.badge} ${styles.badgePrimary}`}>{data.v2_badge}</span>
          <h2 className={styles.desktopSliderTitle}>{data.v2_title}</h2>
          <p className={styles.desktopSliderIntro}>
            <GlossaryText>{data.v2_intro}</GlossaryText>
          </p>
          <SwiperSections
            sections={mobileV2Sections}
            className={styles.desktopSliderSwiper}
            contentAlign="center"
          />
        </div>

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
    </div>
  );
};
