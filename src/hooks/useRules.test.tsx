// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { rulesApi } from '../services/api';
import { useRules, useRuleTemplates } from './useRules';
import type { Rule } from '../services/rulesData';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('refreshes deployment state in the background without blanking the list or overlapping requests', async () => {
  vi.useFakeTimers();
  const pending = { id: 'policy', deployment: { state: 'desired' } } as Rule;
  const observed = { ...pending, deployment: { state: 'observed' } } as Rule;
  let finish!: (value: { rules: Rule[]; total: number; page: number; pageSize: number }) => void;
  const get = vi.spyOn(rulesApi, 'getRules')
    .mockResolvedValueOnce({ rules: [pending], total: 1, page: 1, pageSize: 25 })
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ rules: [observed], total: 1, page: 1, pageSize: 25 });
  const hook = renderHook(() => useRules());
  await act(async () => {});
  expect(hook.result.current.rules[0].deployment?.state).toBe('desired');
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(get).toHaveBeenCalledTimes(2);
  expect(hook.result.current.loading).toBe(false);
  expect(hook.result.current.rules).toEqual([pending]);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(get).toHaveBeenCalledTimes(2);
  await act(async () => { finish({ rules: [observed], total: 1, page: 1, pageSize: 25 }); });
  expect(hook.result.current.rules[0].deployment?.state).toBe('observed');
  hook.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(get).toHaveBeenCalledTimes(2);
});

it('sends targeted template applications to the backend and propagates rejection', async () => {
  const apply = vi.spyOn(rulesApi, 'applyTemplate').mockRejectedValue(new Error('capability unavailable'));
  const hook = renderHook(() => useRuleTemplates());
  const target = { service: 'app', namespace: 'demo' };
  await act(async () => {
    await expect(hook.result.current.applyTemplate('template', target)).rejects.toThrow('capability unavailable');
  });
  expect(apply).toHaveBeenCalledWith('template', target);
});

it('does not let a stale filtered response overwrite the latest rules', async () => {
  let resolveOld!: (value: { rules: never[]; total: number; page: number; pageSize: number }) => void;
  vi.spyOn(rulesApi, 'getRules').mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ rules: [], total: 7, page: 1, pageSize: 25 });
  const { useRules } = await import('./useRules');
  const hook = renderHook(() => useRules());
  await act(async () => { hook.result.current.setParams({ page: 1, pageSize: 25, search: 'new' }); });
  expect(hook.result.current.total).toBe(7);
  await act(async () => { resolveOld({ rules: [], total: 999, page: 1, pageSize: 25 }); });
  expect(hook.result.current.total).toBe(7);
});
