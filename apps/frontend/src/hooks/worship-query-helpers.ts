import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { waitForLifecycleJob } from '@/domains/user/user-lifecycle-service';
import {
  createRateLimitError,
  createNoLogsError,
  shouldSuppressToast,
} from '@/utils/lifecycle-errors';
import { resolveApiErrorKey } from '@/lib/api-error-codes';
import { useResetCooldown } from './use-reset-cooldown';
import { useHasLogsCache } from './use-has-logs-cache';

/**
 * Normalised check for qadaa log type.
 * Guards against casing or whitespace drift in user-facing inputs.
 */
export function isQadaaLogType(type: string): boolean {
  return type.toLowerCase().trim() === 'qadaa';
}

/**
 * Generates a collision-resistant optimistic event ID.
 * Combines timestamp with random suffix for sub-millisecond uniqueness.
 */
export function createOptimisticEventId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useDailyHistoryQuery<TItem>(
  queryKey: QueryKey,
  fetchHistory: (
    params: { startDate: string; endDate: string },
    signal?: AbortSignal,
  ) => Promise<TItem[] | null>,
  date: string,
) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchHistory({ startDate: date, endDate: date }, signal),
  });
}

export function useRangeHistoryQuery<TItem>(
  queryKey: QueryKey,
  fetchHistory: (
    params: { startDate: string; endDate: string },
    signal?: AbortSignal,
  ) => Promise<TItem[] | null>,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchHistory({ startDate, endDate }, signal),
    enabled: !!startDate && !!endDate,
  });
}

export function useInfiniteHistoryQuery<TItem>(
  queryKey: QueryKey,
  fetchPage: (
    cursor?: string,
    signal?: AbortSignal,
  ) => Promise<{ items: TItem[]; nextCursor?: string; hasMore: boolean }>,
  enabled: boolean,
) {
  return useInfiniteQuery<
    { items: TItem[]; nextCursor?: string; hasMore: boolean },
    Error,
    InfiniteData<{ items: TItem[]; nextCursor?: string; hasMore: boolean }, string | undefined>,
    QueryKey,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });
}

export function useWorshipLogMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  onInvalidate: (queryClient: ReturnType<typeof useQueryClient>, variables: TVariables) => void,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      onInvalidate(queryClient, variables);
    },
    onError: (err) => {
      const key = resolveApiErrorKey(err, 'common.error');
      toast.error(t(key));
    },
  });
}

export interface ResetMutationOptions {
  cooldownAction: 'prayers' | 'fasts';
  noLogsMessageKey: string;
  rateLimitedMessageKey: string;
}

export function useLifecycleResetMutation(
  startReset: () => Promise<{ job?: { jobId: string } } | null>,
  jobType: 'reset-prayers' | 'reset-fasts',
  onInvalidate: (queryClient: ReturnType<typeof useQueryClient>) => void,
  successMessageKey: string,
  options: ResetMutationOptions,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const cooldown = useResetCooldown(options.cooldownAction);
  const hasLogs = useHasLogsCache(options.cooldownAction);

  return useMutation({
    mutationFn: async () => {
      if (!cooldown.checkBeforeRequest()) {
        throw createRateLimitError(options.rateLimitedMessageKey, cooldown.secondsRemaining);
      }

      if (hasLogs === false) {
        throw createNoLogsError(options.noLogsMessageKey);
      }

      const started = await startReset();
      const job = started?.job;

      if (!job) return null;

      await waitForLifecycleJob(job.jobId, jobType);
      return job;
    },
    onSuccess: () => {
      cooldown.recordAttempt();
      onInvalidate(queryClient);
      toast.success(t(successMessageKey));
    },
    onError: (err) => {
      if (!shouldSuppressToast(err)) {
        const key = resolveApiErrorKey(err, 'common.error');
        toast.error(t(key));
      }
    },
  });
}
