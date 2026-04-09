import { useEffect, useState } from 'react';
import { loadLocalizedContent } from '@/utils/localized-content';

interface UseLocalizedContentResult<T> {
  data: T | null;
  error: Error | null;
  loadedLanguage: string | null;
  loading: boolean;
  reload: () => void;
}

interface LocalizedContentState<T> {
  data: T | null;
  error: Error | null;
  errorLanguage: string | null;
  loadedLanguage: string | null;
}

export function useLocalizedContent<T>(
  contentName: string,
  language: string,
): UseLocalizedContentResult<T> {
  const [state, setState] = useState<LocalizedContentState<T>>({
    data: null,
    error: null,
    errorLanguage: null,
    loadedLanguage: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    loadLocalizedContent<T>(contentName, language, {
      signal: controller.signal,
    })
      .then((json) => {
        if (cancelled) {
          return;
        }

        setState({
          data: json,
          error: null,
          errorLanguage: null,
          loadedLanguage: language,
        });
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return;
        }

        if (cancelled) {
          return;
        }

        setState({
          data: null,
          error: cause instanceof Error ? cause : new Error('Unable to load localized content.'),
          errorLanguage: language,
          loadedLanguage: language,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contentName, language, reloadKey]);

  const error = state.errorLanguage === language ? state.error : null;
  const loading = state.loadedLanguage !== language && error === null;

  return {
    data: state.data,
    error,
    loadedLanguage: state.loadedLanguage,
    loading,
    reload: () => {
      setState((current) => ({
        ...current,
        error: null,
        errorLanguage: null,
        loadedLanguage: current.loadedLanguage === language ? null : current.loadedLanguage,
      }));
      setReloadKey((value) => value + 1);
    },
  };
}
