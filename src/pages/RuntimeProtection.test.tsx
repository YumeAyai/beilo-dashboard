// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { RuntimeProtection } from './RuntimeProtection';
import { dataplaneApi } from '../services/dataplane';
import i18n from '../i18n';
import { runtimeProtectionLocales } from '../i18n/runtimeProtection';
import type { DataplaneReport, RuntimeEvent, RuntimeMonitorSnapshot } from '../types/dataplane';

const report: DataplaneReport = {
  checked_at: '2026-11-02T01:00:00Z', nodes: [], issues: [],
  components: [{ id: 'tetragon', state: 'available', desired: 2, ready: 1, agents: [{ namespace: 'kube-system', name: 'tetragon', ready: 1, desired: 2, observed: true }] }],
  xdp: { state: 'not_installed', targets: [] }, lb: { state: 'empty', pools: [], services: [] },
};
const base: RuntimeEvent = { time: '2026-11-02T01:00:00Z', namespace: 'prod', pod: 'web', container: 'web', node: 'node-a', policy: 'deny-shell', function: 'bprm_check_security', type: 'process_lsm', action: 'KPROBE_ACTION_OVERRIDE', executable: '/bin/sh', pid: 42 };
const snapshot: RuntimeMonitorSnapshot = { enabled: false, mode: 'observe', checked_at: '', sources: [], profiles: [], findings: [], limitations: [] };

beforeEach(async () => {
  await i18n.changeLanguage('en-US');
  vi.spyOn(dataplaneApi, 'status').mockResolvedValue(report);
  vi.spyOn(dataplaneApi, 'events').mockResolvedValue({ events: [base, { ...base, time: '2026-11-02T01:00:02Z' }, { ...base, namespace: 'dev', action: 'KPROBE_ACTION_POST' }, { ...base, namespace: undefined, pod: undefined, action: 'unexpected_action' }], skipped: 3, possibly_truncated: true });
  vi.spyOn(dataplaneApi, 'monitor').mockResolvedValue(snapshot);
  vi.spyOn(dataplaneApi, 'policies').mockResolvedValue({ items: [], possibly_truncated: false });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mount() { render(<I18nextProvider i18n={i18n}><RuntimeProtection /></I18nextProvider>); }
function stat(label: string) { return screen.getByText(label).closest<HTMLElement>('.MuiCard-root')!; }

describe('dedicated runtime protection', { timeout: 15_000 }, () => {
  it('groups repeated events, preserves workload scope and distinguishes reports from verified blocks', async () => {
    mount();
    const table = await screen.findByRole('table', { name: 'Event aggregation' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(stat('Policy event samples')).getByText('4')).toBeTruthy();
    expect(within(stat('Enforcement action reports')).getByText('2')).toBeTruthy();
    expect(within(stat('Workloads observed')).getByText('2')).toBeTruthy();
    expect(within(stat('Tetragon agents')).getByText('1 / 2')).toBeTruthy();
    expect(screen.getByText(/sample may be truncated/)).toBeTruthy();
    expect(screen.queryByText(/XDP/)).toBeNull();
    fireEvent.click(within(table).getAllByRole('button', { name: 'Details' })[0]);
    const detail = await screen.findByRole('dialog', { name: 'Details' });
    expect(within(detail).getByText('KPROBE_ACTION_OVERRIDE')).toBeTruthy();
    expect(within(detail).getByText('node-a')).toBeTruthy();
    expect(within(detail).getByText('42')).toBeTruthy();
    expect(within(detail).getByText(/do not confirm/)).toBeTruthy();
  });

  it('filters local samples and refreshes the selected server window', async () => {
    mount();
    await screen.findByRole('table', { name: 'Event aggregation' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search workload, process, policy…' }), { target: { value: 'prod' } });
    expect(within(stat('Policy event samples')).getByText('2')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Reported action' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Observe' }));
    expect(within(stat('Policy event samples')).getByText('0')).toBeTruthy();
    expect(screen.getByText(/No matching events/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search workload, process, policy…' }), { target: { value: '' } });
    expect(within(stat('Policy event samples')).getByText('1')).toBeTruthy();
    expect(within(stat('Enforcement action reports')).getByText('0')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Event window' }));
    fireEvent.click(await screen.findByRole('option', { name: '15m' }));
    await waitFor(() => expect(dataplaneApi.events).toHaveBeenLastCalledWith('15m', expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(dataplaneApi.status).toHaveBeenCalledTimes(2));
  });

  it('keeps unavailable sources unknown and explicitly marks retained samples after a failed refresh', async () => {
    vi.mocked(dataplaneApi.status).mockRejectedValue(new Error('forbidden'));
    mount();
    await screen.findByRole('table', { name: 'Event aggregation' });
    expect(within(stat('Tetragon agents')).getByText('—')).toBeTruthy();
    expect(screen.getByText('Unconfirmed')).toBeTruthy();
    vi.mocked(dataplaneApi.events).mockRejectedValue(new Error('Loki unavailable'));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Refresh' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(/Policy events could not be loaded: Loki unavailable/)).toBeTruthy();
    expect(screen.getByText(/Policy events is showing the last successful response/)).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Event aggregation' })).toBeTruthy();
  });

  it('does not show zero agents when the status endpoint returns a partial result with failed agent discovery', async () => {
    vi.mocked(dataplaneApi.status).mockResolvedValue({ ...report, issues: [{ source: 'agents', message: 'source_unavailable' }], components: [{ id: 'tetragon', state: 'unknown', desired: 0, ready: 0, agents: [] }] });
    mount();
    await screen.findByText('Agent status could not be loaded: Unavailable');
    expect(within(stat('Tetragon agents')).getByText('—')).toBeTruthy();
    expect(screen.queryByText('0 / 0')).toBeNull();
    expect(screen.queryByText(/No Tetragon deployment was found/)).toBeNull();
  });

  it('shows only Tetragon findings and retains their independent monitoring window and source health', async () => {
    const finding = { id: 'rt', rule: 'RT-EXEC-001', layer: 'runtime', profile: 'web', namespace: 'prod', pod: 'web', description: 'service_process_requested_shell', severity: 'high', first_seen: base.time, last_seen: base.time, samples: 7, evidence: 'observed_operation_attempt', object: '/bin/sh' };
    vi.mocked(dataplaneApi.monitor).mockResolvedValue({ ...snapshot, enabled: true, sources: [{ source: 'runtime', state: 'degraded', checked_at: base.time, samples: 7, truncated: true, skipped: 1 }], findings: [finding, { ...finding, id: 'http', layer: 'http', rule: 'HTTP-CORAZA' }] });
    mount();
    await screen.findByRole('table', { name: 'Event aggregation' });
    fireEvent.click(screen.getByRole('tab', { name: 'Runtime findings' }));
    expect(await screen.findByText('RT-EXEC-001')).toBeTruthy();
    expect(screen.queryByText('HTTP-CORAZA')).toBeNull();
    expect(screen.getByText(/independent of the event selector/)).toBeTruthy();
    expect(screen.getByText(/Monitoring samples are incomplete/)).toBeTruthy();
    expect(screen.getByText('Service process requested a shell')).toBeTruthy();
  });

  it('creates a scoped deny policy through the existing API and keeps node execution unconfirmed', async () => {
    vi.spyOn(dataplaneApi, 'savePolicy').mockImplementation(async (namespace, name, input) => {
      vi.mocked(dataplaneApi.policies).mockResolvedValue({ items: [{ namespace, name, kind: input.kind, managed: true, paths: input.executables || [], pod_labels: input.pod_labels, enforce: input.enforce, execution_state: 'unknown', resource_version: '2' }], possibly_truncated: false });
    });
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Protection policies' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'New policy' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'New policy' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Policy name/ }), { target: { value: 'deny-shell' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Target Pod labels/ }), { target: { value: 'app=web' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Absolute executable paths/ }), { target: { value: '/bin/sh' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Deny matching operations' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dataplaneApi.savePolicy).toHaveBeenCalledWith('default', 'deny-shell', { kind: 'exec', pod_labels: { app: 'web' }, enforce: true, executables: ['/bin/sh'] }));
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Deny requested')).toBeTruthy();
    expect(within(table).getByText('Unconfirmed')).toBeTruthy();
  });

  it('provides all dedicated page strings in four languages and switches policy controls to Japanese', async () => {
    const keys = Object.keys(runtimeProtectionLocales['en-US']);
    for (const language of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'] as const) {
      expect(Object.keys(runtimeProtectionLocales[language]).sort()).toEqual([...keys].sort());
      for (const key of keys) expect(typeof i18n.getResource(language, 'translation', `runtimeProtection.${key}`)).toBe('string');
    }
    mount();
    await screen.findByRole('table', { name: 'Event aggregation' });
    await act(async () => { await i18n.changeLanguage('ja-JP'); });
    expect(screen.getByRole('heading', { name: 'ランタイム保護' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '保護ポリシー' }));
    expect(await screen.findByRole('button', { name: 'ポリシーを作成' })).toBeTruthy();
    expect(screen.queryByText('New policy')).toBeNull();
  });
});
