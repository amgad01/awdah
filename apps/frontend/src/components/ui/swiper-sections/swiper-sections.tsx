import React, { useId } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, A11y } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import styles from './swiper-sections.module.css';

interface Section {
  id: string;
  content: React.ReactNode;
}

interface SwiperSectionsProps {
  sections: Section[];
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}

export const SwiperSections: React.FC<SwiperSectionsProps> = ({
  sections,
  showDots = true,
  showArrows = true,
  className = '',
}) => {
  const { isRTL, language, t } = useLanguage();
  const uniqueId = useId();

  if (sections.length === 0) return null;

  const instanceId = uniqueId.replace(/:/g, '');
  const paginationClass = `swiper-pagination-${instanceId}`;
  const prevBtnClass = `swiper-prev-${instanceId}`;
  const nextBtnClass = `swiper-next-${instanceId}`;

  return (
    <div className={`${styles.container} ${className}`.trim()} data-testid="swiper-sections">
      <Swiper
        modules={[Pagination, Navigation, A11y]}
        autoHeight
        spaceBetween={16}
        slidesPerView={1}
        dir={isRTL ? 'rtl' : 'ltr'}
        key={language}
        pagination={
          showDots
            ? {
                el: `.${paginationClass}`,
                clickable: true,
                bulletClass: styles.paginationBullet,
                bulletActiveClass: styles.paginationBulletActive,
              }
            : false
        }
        navigation={
          showArrows
            ? {
                prevEl: `.${prevBtnClass}`,
                nextEl: `.${nextBtnClass}`,
              }
            : false
        }
        className={styles.swiper}
        a11y={{
          prevSlideMessage: t('common.previous', 'Previous'),
          nextSlideMessage: t('common.next', 'Next'),
          firstSlideMessage: t('common.first_item', 'This is the first section'),
          lastSlideMessage: t('common.last_item', 'This is the last section'),
        }}
      >
        {sections.map((section) => (
          <SwiperSlide key={section.id} className={styles.slide}>
            <div className={styles.slideContent}>{section.content}</div>
          </SwiperSlide>
        ))}
      </Swiper>

      {showArrows && sections.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonLeft} ${prevBtnClass}`}
            aria-label={t('common.previous', 'Previous')}
          >
            {isRTL ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonRight} ${nextBtnClass}`}
            aria-label={t('common.next', 'Next')}
          >
            {isRTL ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        </>
      )}

      {showDots && sections.length > 1 && (
        <div className={`${styles.pagination} ${paginationClass}`} aria-hidden="true" />
      )}
    </div>
  );
};
