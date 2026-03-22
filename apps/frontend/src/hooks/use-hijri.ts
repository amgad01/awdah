import { HijriDate } from '@awdah/shared';
import { useLanguage } from './use-language';

export const useHijri = () => {
  const { language } = useLanguage();
  const locale = (language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';

  const formatDate = (date: HijriDate) => {
    return date.format(locale);
  };

  return {
    today: HijriDate.today(),
    formatDate,
    parseString: HijriDate.fromString,
    fromObject: HijriDate.fromObject,
    fromGregorian: HijriDate.fromGregorian,
  };
};
