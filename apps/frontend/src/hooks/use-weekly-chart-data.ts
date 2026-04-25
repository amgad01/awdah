import { useSalahHistory, useSawmHistory } from '@/hooks/use-worship';
import { todayHijriDate, addHijriDays } from '@/utils/date-utils';

function useChartDateRange(enabled: boolean) {
  // Always compute dates: hooks cannot be called conditionally.
  // When disabled, empty strings are passed to the query hooks which
  // will skip fetching (React Query enabled:false is handled by the callers).
  const today = todayHijriDate();
  const sevenDaysAgo = addHijriDays(today, -6);
  return {
    start: enabled ? sevenDaysAgo : '',
    end: enabled ? today : '',
    today,
    sevenDaysAgo,
  };
}

export const useSalahWeeklyChartData = (enabled = true) => {
  const { start, end, sevenDaysAgo, today } = useChartDateRange(enabled);
  const salahQuery = useSalahHistory(start, end);
  return { salah: salahQuery, dateRange: { start: sevenDaysAgo, end: today } };
};

export const useSawmWeeklyChartData = (enabled = true) => {
  const { start, end, sevenDaysAgo, today } = useChartDateRange(enabled);
  const sawmQuery = useSawmHistory(start, end);
  return { sawm: sawmQuery, dateRange: { start: sevenDaysAgo, end: today } };
};

export const useWeeklyChartData = (enabled = true) => {
  const { start, end, sevenDaysAgo, today } = useChartDateRange(enabled);
  const salahQuery = useSalahHistory(start, end);
  const sawmQuery = useSawmHistory(start, end);
  return {
    salah: salahQuery,
    sawm: sawmQuery,
    dateRange: { start: sevenDaysAgo, end: today },
  };
};
