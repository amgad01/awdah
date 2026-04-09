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
import { waitForLifecycleJob } from '@/lib/user-lifecycle-jobs';

export function useDailyHistoryQuery<TItem>(
  queryKey: QueryKey,
  fetchHistory: (params: { startDate: string; endDate: string }) => Promise<TItem[] | null>,
  date: string,
) {
  return useQuery({
    queryKey,
    queryFn: () => fetchHistory({ startDate: date, endDate: date }),
  });
}

export function useRangeHistoryQuery<TItem>(
  queryKey: QueryKey,
  fetchHistory: (params: { startDate: string; endDate: string }) => Promise<TItem[] | null>,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey,
    queryFn: () => fetchHistory({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  });
}

export function useInfiniteHistoryQuery<TItem>(
  queryKey: QueryKey,
  fetchPage: (
    cursor?: string,
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
    queryFn: ({ pageParam }) => fetchPage(pageParam),
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
      toast.error(err instanceof Error ? err.message : t('common.error'));
    },
  });
}

export function useLifecycleResetMutation(
  startReset: () => Promise<{ job?: { jobId: string } } | null>,
  jobType: 'reset-prayers' | 'reset-fasts',
  onInvalidate: (queryClient: ReturnType<typeof useQueryClient>) => void,
  successMessageKey: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async () => {
      const started = await startReset();
      const job = started?.job;

      if (!job) {
        throw new Error(
          jobType === 'reset-prayers'
            ? 'Prayer log reset could not be started.'
            : 'Fast log reset could not be started.',
        );
      }

      await waitForLifecycleJob(job.jobId, jobType);
      return job;
    },
    onSuccess: () => {
      onInvalidate(queryClient);
      toast.success(t(successMessageKey));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    },
  });
}
