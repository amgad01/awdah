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
import { useResetCooldown } from './use-reset-cooldown';
import { useHasLogsCache } from './use-has-logs-cache';

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
      const message = err instanceof Error ? err.message : 'common.error';
      toast.error(t(message));
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
      // Check cooldown before sending request
      if (!cooldown.checkBeforeRequest()) {
        throw createRateLimitError(options.rateLimitedMessageKey, cooldown.secondsRemaining);
      }

      // Check logs cache - if we know there are no logs, fail fast
      if (hasLogs === false) {
        throw createNoLogsError(options.noLogsMessageKey);
      }

      const started = await startReset();
      const job = started?.job;

      if (!job) {
        throw new Error(
          jobType === 'reset-prayers'
            ? 'settings.reset_prayers_start_failed'
            : 'settings.reset_fasts_start_failed',
        );
      }

      await waitForLifecycleJob(job.jobId, jobType);
      return job;
    },
    onSuccess: () => {
      // Record cooldown only after successful completion
      cooldown.recordAttempt();
      onInvalidate(queryClient);
      toast.success(t(successMessageKey));
    },
    onError: (err) => {
      // Skip toast for rate limiting and no records - handled by UI (disabled button + countdown)
      if (!shouldSuppressToast(err)) {
        const message = err instanceof Error ? err.message : 'common.error';
        toast.error(t(message));
      }
    },
  });
}
