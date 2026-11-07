// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useDataplaneResource } from './useDataplaneResource';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('dataplane request lifecycle', () => {
  it('starts polling only when enabled and stops without another fetch when disabled', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => 'current data');
    const hook = renderHook(({ enabled }) => useDataplaneResource('status', load, enabled), { initialProps: { enabled: false } });
    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(load).toHaveBeenCalledTimes(1);
    hook.rerender({ enabled: true });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(load).toHaveBeenCalledTimes(2);
    hook.rerender({ enabled: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(load).toHaveBeenCalledTimes(2);
    expect(hook.result.current.data).toBe('current data');
    await act(async () => { await hook.result.current.refresh(); });
    expect(load).toHaveBeenCalledTimes(3);
    hook.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('keeps an in-flight initial request when automatic refresh is switched off', async () => {
    let complete!: (value: string) => void;
    const load = vi.fn((signal: AbortSignal) => {
      expect(signal.aborted).toBe(false);
      return new Promise<string>(resolve => { complete = resolve; });
    });
    const hook = renderHook(({ enabled }) => useDataplaneResource('status', load, enabled), { initialProps: { enabled: true } });
    const signal = load.mock.calls[0][0];
    hook.rerender({ enabled: false });
    expect(signal.aborted).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { complete('completed'); });
    expect(hook.result.current.data).toBe('completed');
  });

  it('never leaks previous-namespace data or an obsolete response into the new scope', async () => {
    let finishOld: (value: string) => void = () => {};
    let finishNew: (value: string) => void = () => {};
    const oldLoad = () => new Promise<string>(resolve => { finishOld = resolve; });
    const newLoad = () => new Promise<string>(resolve => { finishNew = resolve; });
    const hook = renderHook(({ scope, load }) => useDataplaneResource(scope, load), { initialProps: { scope: 'old', load: oldLoad } });
    hook.rerender({ scope: 'new', load: newLoad });
    await act(async () => { finishOld('old data'); });
    expect(hook.result.current.data).toBeNull();
    await act(async () => { finishNew('new data'); });
    await waitFor(() => expect(hook.result.current.data).toBe('new data'));
  });
  it('aborts superseded requests and reports only the current failure', async () => {
    const signals: AbortSignal[] = [];
    const oldLoad = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(() => {});
    });
    const newLoad = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return Promise.reject(new Error('current backend unavailable'));
    });
    const hook = renderHook(({ scope, load }) => useDataplaneResource(scope, load), { initialProps: { scope: 'old', load: oldLoad } });
    hook.rerender({ scope: 'new', load: newLoad });
    await waitFor(() => expect(hook.result.current.error).toBe('current backend unavailable'));
    expect(hook.result.current.data).toBeNull();
    expect(hook.result.current.loading).toBe(false);
    expect(signals[0].aborted).toBe(true);
    hook.unmount();
    expect(signals[1].aborted).toBe(true);
  });
});
