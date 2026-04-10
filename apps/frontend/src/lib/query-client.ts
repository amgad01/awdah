import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/api';

const QUERY_RETRY_LIMIT = 2;
const QUERY_RETRY_BASE_DELAY_MS = 400;
const QUERY_RETRY_MAX_DELAY_MS = 5000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= QUERY_RETRY_LIMIT) {
    return false;
  }

  if (isAbortError(error)) {
    return false;
  }

  if (error instanceof ApiRequestError) {
    if (error.status === 408 || error.status === 429) {
      return true;
    }

    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }

  return true;
}

function getRetryDelay(attemptIndex: number): number {
  const cappedDelay = Math.min(
    QUERY_RETRY_BASE_DELAY_MS * 2 ** attemptIndex,
    QUERY_RETRY_MAX_DELAY_MS,
  );
  const halfDelay = Math.floor(cappedDelay / 2);
  return halfDelay + Math.floor(Math.random() * Math.max(halfDelay, 1));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: shouldRetryQuery,
      retryDelay: getRetryDelay,
      refetchOnWindowFocus: false,
    },
  },
});
