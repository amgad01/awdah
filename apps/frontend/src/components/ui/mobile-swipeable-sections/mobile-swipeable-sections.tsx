import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipe } from '@/hooks/use-swipe';
import { useLanguage } from '@/hooks/use-language';
import styles from './mobile-swipeable-sections.module.css';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface MobileSwipeableSectionsProps {
  sections: Section[];
  showDots?: boolean;
  showArrows?: boolean;
}

export const MobileSwipeableSections: React.FC<MobileSwipeableSectionsProps> = ({
  sections,
  showDots = true,
  showArrows = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isRTL } = useLanguage();

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sections.length);
  }, [sections.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sections.length) % sections.length);
  }, [sections.length]);

  const goToSection = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const { containerRef, handlers } = useSwipe({
    onSwipeLeft: isRTL ? goToPrev : goToNext,
    onSwipeRight: isRTL ? goToNext : goToPrev,
    threshold: 50,
  });

  if (sections.length === 0) return null;

  // Slide transform - same for both RTL and LTR (negative = slide left)
  const translateX = -currentIndex * 100;

  return (
    <div className={styles.container} data-testid="mobile-swipeable-sections">
      <div
        ref={containerRef}
        className={styles.swipeArea}
        data-testid="mobile-swipeable-sections-swipe-area"
        {...handlers}
      >
        <div
          className={styles.slidesContainer}
          style={{
            transform: `translateX(${translateX}%)`,
          }}
        >
          {sections.map((section) => (
            <div key={section.id} className={styles.slide}>
              <div className={styles.slideContent}>{section.content}</div>
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonLeft}`}
            onClick={goToPrev}
            aria-label="Previous section"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonRight}`}
            onClick={goToNext}
            aria-label="Next section"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {showDots && (
        <div className={styles.dotsContainer}>
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              onClick={() => goToSection(index)}
              aria-label={`Go to ${section.title}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}

      <div className={styles.sectionTitle}>{sections[currentIndex].title}</div>
    </div>
  );
};
