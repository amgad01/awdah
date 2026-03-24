import React, { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
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
}

export const AboutPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine the URL based on the current language
    const dataUrl = `${import.meta.env.BASE_URL}data/about-${language}.json`;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(dataUrl)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load about data:', err);
        setLoading(false);
      });
  }, [language]);

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
          <Icons.Heart size={20} className={styles.missionIcon} />
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
            const IconComponent =
              (Icons as unknown as Record<string, Icons.LucideIcon>)[feature.icon] ??
              Icons.HelpCircle;
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
          <p className={styles.devBio}>{member.bio}</p>

          <div className={styles.devLinks}>
            <a
              href={`https://github.com/${member.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.devLink}
            >
              <Icons.Github size={18} />
              <span>GitHub</span>
            </a>
            {member.socials.map((link) => {
              const Icon =
                (Icons as unknown as Record<string, Icons.LucideIcon>)[
                  link.type.charAt(0).toUpperCase() + link.type.slice(1)
                ] ?? Icons.Link;
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
        </section>
      ))}
    </div>
  );
};
