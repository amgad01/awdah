import React from 'react';
import { Link } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import type { ReferenceLink } from '@/content/references/reference-links';
import styles from './reference-links.module.css';

interface ReferenceLinksProps {
  heading: string;
  references: ReferenceLink[];
  className?: string;
  compact?: boolean;
}

export const ReferenceLinks: React.FC<ReferenceLinksProps> = ({
  heading,
  references,
  className,
  compact = false,
}) => {
  if (!references.length) {
    return null;
  }

  if (compact) {
    return (
      <section
        className={`${styles.compactReferences} ${className ?? ''}`.trim()}
        aria-label={heading}
      >
        <span className={styles.compactLabel}>{heading}</span>
        <ul className={styles.compactList}>
          {references.map((reference, index) => (
            <li key={`${reference.label}-${reference.url}`} className={styles.compactListItem}>
              {index > 0 ? <span className={styles.compactSeparator}>·</span> : null}
              {reference.url.startsWith('/') ? (
                <Link className={styles.compactLink} to={reference.url}>
                  {reference.label}
                </Link>
              ) : (
                <a
                  className={styles.compactLink}
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {reference.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={`${styles.references} ${className ?? ''}`.trim()} aria-label={heading}>
      <h4 className={styles.heading}>{heading}</h4>
      <ul className={styles.list}>
        {references.map((reference) => (
          <li key={`${reference.label}-${reference.url}`} className={styles.listItem}>
            {reference.url.startsWith('/') ? (
              <Link className={styles.link} to={reference.url}>
                <LinkIcon size={14} aria-hidden="true" />
                <span>{reference.label}</span>
              </Link>
            ) : (
              <a
                className={styles.link}
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkIcon size={14} aria-hidden="true" />
                <span>{reference.label}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
