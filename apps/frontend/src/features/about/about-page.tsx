import React, { useEffect, useState } from 'react';
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
  Shield,
  Sun,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { ErrorState } from '@/components/ui/error-state/error-state';
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
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const FEATURE_ICONS: Record<string, IconComponent> = {
  Moon,
  Sun,
  Calendar,
  Globe,
  Shield,
  BookOpen,
};

const SOCIAL_ICONS: Record<string, IconComponent> = {
  linkedin: Linkedin,
};

export const AboutPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [data, setData] = useState<AboutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const dataUrl = `${import.meta.env.BASE_URL}data/about-${language}.json`;
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const res = await fetch(dataUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load About content (${res.status})`);
        }

        const json = (await res.json()) as AboutData;
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
    return <ErrorState message={error} onRetry={() => setRefreshKey((v) => v + 1)} />;
  }

  if (loading || !data) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.page} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* ── Project Section ── */}
      <section className={styles.hero}>
        <span className={styles.heroBadge}>{data.project_badge}</span>
        <h1 className={styles.heroTitle}>{data.project_title}</h1>
        <p className={styles.heroSubtitle}>{data.project_subtitle}</p>
      </section>

      <section className={styles.missionSection}>
        <div className={styles.missionCard}>
          <Heart size={20} className={styles.missionIcon} />
          <h2 className={styles.sectionTitle}>{data.why_title}</h2>
          <p className={styles.sectionBody}>{data.why_body}</p>
        </div>
      </section>

      <section className={styles.audienceSection}>
        <h2 className={styles.sectionTitle}>{data.who_title}</h2>
        <p className={styles.sectionBody}>{data.who_body}</p>
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
                <p>{feature.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Team Section ── */}
      {data.team.map((member) => (
        <section key={member.id} className={styles.devSection}>
          <span className={styles.heroBadge}>{data.team_title}</span>
          <h2 className={styles.devTitle}>{member.name}</h2>
          <p className={styles.devHeadline}>{member.role}</p>
          {member.bio
            .split(/\n\s*\n/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={`${member.id}-bio-${index}`} className={styles.devBio}>
                {paragraph}
              </p>
            ))}

          <div className={styles.devLinks}>
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

          <div className={styles.devTech}>
            <h3 className={styles.devTechTitle}>{member.tech_title}</h3>
            <div className={styles.techPills}>
              {member.tech.map((tech) => (
                <span key={tech} className={styles.techPill}>
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {member.languages && member.languages.length > 0 ? (
            <div className={styles.devTech}>
              <h3 className={styles.devTechTitle}>{member.languages_title}</h3>
              <div className={styles.techPills}>
                {member.languages.map((languageName) => (
                  <span key={languageName} className={styles.techPill}>
                    {languageName}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {member.certifications && member.certifications.length > 0 ? (
            <div className={styles.devTech}>
              <h3 className={styles.devTechTitle}>{member.certifications_title}</h3>
              <div className={styles.techPills}>
                {member.certifications.map((certification) => (
                  <span key={certification} className={styles.techPill}>
                    {certification}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ))}

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
  );
};
