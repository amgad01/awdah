import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoData } from './demo-types';

const DEMO_DATA_URL = `${import.meta.env.BASE_URL}demo-data/sample-user.json`;

interface DemoDataState {
  data: DemoData | null;
  error: Error | null;
  loading: boolean;
}

export function useDemoData() {
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<DemoDataState>({
    data: null,
    error: null,
    loading: true,
  });

  const loadDemo = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((current) => ({
      ...current,
      error: null,
      loading: true,
    }));

    try {
      const response = await fetch(DEMO_DATA_URL, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Demo data request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as DemoData;
      if (controller.signal.aborted) {
        return;
      }

      setState({
        data: payload,
        error: null,
        loading: false,
      });
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return;
      }

      setState({
        data: null,
        error: cause instanceof Error ? cause : new Error('Unable to load demo data.'),
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    void loadDemo();
    return () => {
      controllerRef.current?.abort();
    };
  }, [loadDemo]);

  return {
    ...state,
    reload: loadDemo,
  };
}
