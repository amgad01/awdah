import type { HijriDate } from '@awdah/shared';

type EffectiveStartSettings = {
  bulughDate: HijriDate;
  revertDate?: HijriDate;
};

// For reverts, use the later of bulugh date and revert date.
export function resolveEffectiveStartDate(settings: EffectiveStartSettings): HijriDate {
  return settings.revertDate && settings.revertDate.isAfter(settings.bulughDate)
    ? settings.revertDate
    : settings.bulughDate;
}
