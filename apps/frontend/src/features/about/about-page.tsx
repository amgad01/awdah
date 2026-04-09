import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Github,
  Globe,
  Heart,
  HelpCircle,
  Link as LinkIcon,
  Linkedin,
  Moon,
  Server,
  Shield,
  Sun,
  Tag,
  Layers,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { ErrorState } from '@/components/ui/error-state/error-state';
import { useLocalizedContent } from '@/hooks/use-localized-content';
import { GlossaryText } from '@/components/ui/term-tooltip';
import { SwiperSections } from '@/components/ui/swiper-sections';
import styles from './about-page.module.css';

interface SocialLink {
  type: string;
  url: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  github: string;
  socials: SocialLink[];
  tech_title: string;
  tech: string[];
  languages_title?: string;
  languages?: string[];
  certifications_title?: string;
  certifications?: string[];
}

interface ProjectFeature {
  id: string;
  icon: string;
  title: string;
  body: string;
}

interface AboutData {
  project_badge: string;
  project_title: string;
  project_subtitle: string;
  why_title: string;
  why_body: string;
  who_title: string;
  who_body: string;
  features_title: string;
  features: ProjectFeature[];
  team_title: string;
  team: TeamMember[];
  privacy_title: string;
  version_title?: string;
  version_body?: string;
  stack_title?: string;
  stack_items?: string[];
  contribute_title?: string;
  contribute_body?: string;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface ExpertiseGroup {
  id: string;
  title: string;
  items: string[];
}

const FEATURE_ICONS: Record<string, IconComponent> = {
  Moon,
  Sun,
  Calendar,
  Globe,
  Shield,
  BookOpen,
  Server,
};

const SOCIAL_ICONS: Record<string, IconComponent> = {
  linkedin: Linkedin,
};

const getFounderExpertiseGroups = (member: TeamMember): ExpertiseGroup[] =>
  [
    {
      id: 'tech',
      title: member.tech_title,
      items: member.tech,
    },
    member.languages && member.languages.length > 0
      ? {
          id: 'languages',
          title: member.languages_title ?? '',
          items: member.languages,
        }
      : null,
    member.certifications && member.certifications.length > 0
      ? {
          id: 'certifications',
          title: member.certifications_title ?? '',
          items: member.certifications,
        }
      : null,
  ].filter(
    (group): group is ExpertiseGroup =>
      group !== null && group.title.length > 0 && group.items.length > 0,
  );

const renderExpertiseGroup = (group: ExpertiseGroup, isMobile: boolean): React.JSX.Element => {
  const titleClass = isMobile ? styles.expertiseSlideTitle : styles.devTechTitle;
  const containerClass = isMobile ? styles.expertiseSlide : styles.expertiseBlock;
  const pillsClass = isMobile ? styles.expertiseSlidePills : styles.techPills;
  const pillClass = isMobile ? styles.expertiseSlidePill : styles.techPill;

  return (
    <div key={group.id} className={containerClass}>
      <h3 className={titleClass}>{group.title}</h3>
      <div className={pillsClass}>
        {group.items.map((item) => (
          <span key={item} className={pillClass}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const renderBioParagraphs = (bio: string, memberId: string): React.JSX.Element[] =>
  bio
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={`${memberId}-bio-${index}`} className={styles.devBio}>
        <GlossaryText>{paragraph}</GlossaryText>
      </p>
    ));

const renderMemberLinks = (member: TeamMember): React.JSX.Element => (
  <div className={styles.founderLinks}>
    <a
      href={`https://github.com/${member.github}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.devLink}
    >
      <Github size={18} />
      <span>GitHub</span>
    </a>
    {member.socials.map((link) => {
      const Icon = SOCIAL_ICONS[link.type] ?? LinkIcon;
      return (
        <a
          key={link.type}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.devLink}
        >
          <Icon size={18} />
          <span>{link.type.charAt(0).toUpperCase() + link.type.slice(1)}</span>
        </a>
      );
    })}
  </div>
);

export const AboutPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { data, error, loadedLanguage, loading, reload } = useLocalizedContent<AboutData>(
    'about',
    language,
  );

  // Prepare feature/mission/audience sections for mobile slider
  const contentSliderSections = useMemo(() => {
    if (!data) {
      return [];
    }

    const sections = [
      {
        id: 'mission',
        content: (
          <section className={styles.missionSection}>
            <div className={styles.missionCard}>
              <Heart size={20} className={styles.missionIcon} />
              <h2 className={styles.sectionTitle}>{data.why_title}</h2>
              <p className={styles.sectionBody}>
                <GlossaryText>{data.why_body}</GlossaryText>
              </p>
            </div>
          </section>
        ),
      },
      {
        id: 'audience',
        content: (
          <section className={styles.audienceSection}>
            <h2 className={styles.sectionTitle}>{data.who_title}</h2>
            <p className={styles.sectionBody}>
              <GlossaryText>{data.who_body}</GlossaryText>
            </p>
          </section>
        ),
      },
      ...data.features.map((feature) => {
        const IconComponent = FEATURE_ICONS[feature.icon] ?? HelpCircle;
        return {
          id: `feature-${feature.id}`,
          content: (
            <section className={styles.featureCard}>
              <IconComponent size={24} className={styles.featureIcon} />
              <h3>{feature.title}</h3>
              <p>
                <GlossaryText>{feature.body}</GlossaryText>
              </p>
            </section>
          ),
        };
      }),
    ];

    return sections;
  }, [data]);

  // For mobile: if only 1 team member, show all details listed; if multiple, show slider with 1 card per member
  const renderMobileTeamSection = () => {
    if (!data || !data.team || data.team.length === 0) {
      return null;
    }

    // Single contributor: show everything listed without slider
    if (data.team.length === 1) {
      const member = data.team[0];
      const groups = getFounderExpertiseGroups(member);
      return (
        <section className={styles.founderCardFull}>
          <div className={styles.founderHeader}>
            <div className={styles.founderAvatar}>
              <Github size={48} />
            </div>
            <div className={styles.founderInfo}>
              <h2 className={styles.devTitle}>{member.name}</h2>
              <p className={styles.devHeadline}>{member.role}</p>
            </div>
          </div>

          <div className={styles.founderBio}>{renderBioParagraphs(member.bio, member.id)}</div>

          {renderMemberLinks(member)}

          <div className={styles.founderExpertiseMobile}>
            {groups.map((group) => renderExpertiseGroup(group, true))}
          </div>
        </section>
      );
    }

    // Multiple contributors: slider with one card per member
    const memberSections = data.team.map((member) => {
      const groups = getFounderExpertiseGroups(member);
      return {
        id: `${language}-${member.id}`,
        content: (
          <section className={styles.founderCard}>
            <div className={styles.founderHeader}>
              <div className={styles.founderAvatar}>
                <Github size={48} />
              </div>
              <div className={styles.founderInfo}>
                <h2 className={styles.devTitle}>{member.name}</h2>
                <p className={styles.devHeadline}>{member.role}</p>
              </div>
            </div>

            <div className={styles.founderBio}>{renderBioParagraphs(member.bio, member.id)}</div>

            {renderMemberLinks(member)}

            <div className={styles.founderExpertiseMobile}>
              {groups.map((group) => renderExpertiseGroup(group, true))}
            </div>
          </section>
        ),
      };
    });

    return <SwiperSections sections={memberSections} className={styles.founderSlider} />;
  };

  if (error) {
    return <ErrorState message={error.message || t('common.error')} onRetry={reload} />;
  }

  if (loading || loadedLanguage !== language || !data) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <main className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile View - Static Header + Slider + Static Footer */}
      <div className={styles.mobileSwipeView} data-testid="about-mobile-view">
        {/* Static Hero */}
        <section className={styles.hero}>
          <span className={styles.heroBadge}>{data.project_badge}</span>
          <h1 className={styles.heroTitle}>{data.project_title}</h1>
          <p className={styles.heroSubtitle}>
            <GlossaryText>{data.project_subtitle}</GlossaryText>
          </p>
        </section>

        {/* Content Slider: Mission, Audience, Features */}
        <div className={styles.sliderSection}>
          <SwiperSections sections={contentSliderSections} />
        </div>

        {/* Team Section - Mobile Only */}
        <div className={styles.founderExpertiseSlider}>{renderMobileTeamSection()}</div>

        {/* Static Footer Sections */}
        {data.contribute_title ? (
          <section className={styles.legalSection}>
            <div className={styles.legalCard}>
              <Users size={20} className={styles.legalIcon} />
              <h2 className={styles.sectionTitle}>{data.contribute_title}</h2>
              <p className={styles.sectionBody}>{data.contribute_body}</p>
              <div className={styles.legalLinks}>
                <Link to="/contribute" className={styles.legalLink}>
                  <Users size={18} />
                  <span>{t('nav.contributing')}</span>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.legalSection}>
          <div className={styles.legalCard}>
            <Tag size={20} className={styles.legalIcon} />
            <h2 className={styles.sectionTitle}>
              {data.version_title || t('about.version_title', 'Version')}
            </h2>
            <p className={styles.sectionBody}>
              {import.meta.env.VITE_APP_VERSION || data.version_body || 'v1.1.1'}
            </p>
            <div className={styles.devTech}>
              <h3 className={styles.devTechTitle}>
                <Layers size={16} className={styles.devTechTitleIcon} />
                {data.stack_title || t('about.stack_title', 'Stack')}
              </h3>
              <div className={styles.techPills}>
                {(data.stack_items || ['React', 'TypeScript', 'AWS CDK', 'DynamoDB', 'Lambda']).map(
                  (item) => (
                    <span key={item} className={styles.techPill}>
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.legalSection}>
          <div className={styles.legalCard}>
            <Shield size={20} className={styles.legalIcon} />
            <h2 className={styles.sectionTitle}>{data.privacy_title}</h2>
            <p className={styles.sectionBody}>
              {t('privacy.contact_body', { email: import.meta.env.VITE_APP_EMAIL })}
            </p>
            <div className={styles.legalLinks}>
              <Link to="/privacy" className={styles.legalLink}>
                <Shield size={18} />
                <span>{t('nav.privacy')}</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Desktop Scroll View */}
      <div className={styles.desktopScrollView} data-testid="about-desktop-view">
        {/* ── Project Section ── */}
        <section className={styles.hero}>
          <span className={styles.heroBadge}>{data.project_badge}</span>
          <h1 className={styles.heroTitle}>{data.project_title}</h1>
          <p className={styles.heroSubtitle}>
            <GlossaryText>{data.project_subtitle}</GlossaryText>
          </p>
        </section>

        <section className={styles.missionSection}>
          <div className={styles.missionCard}>
            <Heart size={20} className={styles.missionIcon} />
            <h2 className={styles.sectionTitle}>{data.why_title}</h2>
            <p className={styles.sectionBody}>
              <GlossaryText>{data.why_body}</GlossaryText>
            </p>
          </div>
        </section>

        <section className={styles.audienceSection}>
          <h2 className={styles.sectionTitle}>{data.who_title}</h2>
          <p className={styles.sectionBody}>
            <GlossaryText>{data.who_body}</GlossaryText>
          </p>
        </section>

        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>{data.features_title}</h2>
          <div className={styles.featureGrid}>
            {data.features.map((feature) => {
              const IconComponent = FEATURE_ICONS[feature.icon] ?? HelpCircle;
              return (
                <div key={feature.id} className={styles.featureCard}>
                  <IconComponent size={20} className={styles.featureIcon} />
                  <h3>{feature.title}</h3>
                  <p>
                    <GlossaryText>{feature.body}</GlossaryText>
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Team Section ── */}
        <section className={styles.devSection}>
          <span className={styles.heroBadge}>{data.team_title}</span>
          {data.team.map((member) => {
            const memberExpertiseGroups = getFounderExpertiseGroups(member);
            return (
              <div key={member.id} className={styles.founderCard}>
                <div className={styles.founderHeader}>
                  <div className={styles.founderAvatar}>
                    <Github size={48} />
                  </div>
                  <div className={styles.founderInfo}>
                    <h2 className={styles.devTitle}>{member.name}</h2>
                    <p className={styles.devHeadline}>{member.role}</p>
                  </div>
                </div>

                <div className={styles.founderBio}>
                  {renderBioParagraphs(member.bio, member.id)}
                </div>

                {renderMemberLinks(member)}

                <div className={styles.founderExpertise}>
                  {memberExpertiseGroups.map((group) => renderExpertiseGroup(group, false))}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Contribute Section ── */}
        {data.contribute_title ? (
          <section className={styles.legalSection}>
            <div className={styles.legalCard}>
              <Users size={20} className={styles.legalIcon} />
              <h2 className={styles.sectionTitle}>{data.contribute_title}</h2>
              <p className={styles.sectionBody}>{data.contribute_body}</p>
              <div className={styles.legalLinks}>
                <Link to="/contribute" className={styles.legalLink}>
                  <Users size={18} />
                  <span>{t('nav.contributing')}</span>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Version & Stack Metadata Section ── */}
        <section className={styles.legalSection}>
          <div className={styles.legalCard}>
            <Tag size={20} className={styles.legalIcon} />
            <h2 className={styles.sectionTitle}>
              {data.version_title || t('about.version_title', 'Version')}
            </h2>
            <p className={styles.sectionBody}>
              {import.meta.env.VITE_APP_VERSION || data.version_body || 'v1.1.1'}
            </p>
            <div className={styles.devTech}>
              <h3 className={styles.devTechTitle}>
                <Layers size={16} className={styles.devTechTitleIcon} />
                {data.stack_title || t('about.stack_title', 'Stack')}
              </h3>
              <div className={styles.techPills}>
                {(data.stack_items || ['React', 'TypeScript', 'AWS CDK', 'DynamoDB', 'Lambda']).map(
                  (item) => (
                    <span key={item} className={styles.techPill}>
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Privacy/Legal Section ── */}
        <section className={styles.legalSection}>
          <div className={styles.legalCard}>
            <Shield size={20} className={styles.legalIcon} />
            <h2 className={styles.sectionTitle}>{data.privacy_title}</h2>
            <p className={styles.sectionBody}>
              {t('privacy.contact_body', { email: import.meta.env.VITE_APP_EMAIL })}
            </p>
            <div className={styles.legalLinks}>
              <Link to="/privacy" className={styles.legalLink}>
                <Shield size={18} />
                <span>{t('nav.privacy')}</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
