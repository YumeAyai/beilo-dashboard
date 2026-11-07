import { useCallback, useEffect, useRef, useState } from 'react';

interface RemoteState<T> { key: string; data: T | null; error: string; loading: boolean }

/** Cancels superseded requests and never exposes data from a previous scope. */
export function useDataplaneResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>, autoRefresh = false) {
  const [state, setState] = useState<RemoteState<T>>({ key, data: null, error: '', loading: true });
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState(previous => ({ key, data: previous.key === key ? previous.data : null, error: '', loading: true }));
    try {
      const data = await load(controller.signal);
      if (!controller.signal.aborted) setState({ key, data, error: '', loading: false });
    } catch (error) {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, key, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }, [key, load]);
  useEffect(() => {
    void refresh();
    return () => { active.current?.abort(); };
  }, [refresh]);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh, autoRefresh]);
  const current = state.key === key ? state : { key, data: null, error: '', loading: true };
  return { ...current, refresh };
}
