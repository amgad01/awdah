/**
 * Barrel re-export — all worship-related hooks split into focused modules.
 *
 * Consumers continue importing from `@/hooks/use-worship` with no changes.
 */

export {
  useSalahDebt,
  useLogPrayer,
  useDeletePrayer,
  useDailyPrayerLogs,
  useSalahHistory,
  useInfiniteSalahHistory,
  useResetPrayerLogs,
} from './use-salah-queries';

export {
  useSawmDebt,
  useLogFast,
  useDeleteFast,
  useDailySawmLog,
  useSawmHistory,
  useInfiniteSawmHistory,
  useResetFastLogs,
} from './use-sawm-queries';

export { useInfiniteCombinedHistory, type CombinedHistoryItem } from './use-combined-history';

export { useStreak, useStreakDetails, type BestPrayerStreak } from './use-streak';

// Composite hook — combines salah + sawm debt into a single object
import { useSalahDebt } from './use-salah-queries';
import { useSawmDebt } from './use-sawm-queries';

export const useWorship = () => {
  const salahQuery = useSalahDebt();
  const sawmQuery = useSawmDebt();

  return {
    salahDebt: salahQuery.data,
    sawmDebt: sawmQuery.data,
    loading: salahQuery.isLoading || sawmQuery.isLoading,
    error: salahQuery.error || sawmQuery.error,
  };
};
