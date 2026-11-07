// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { Dataplane } from './Dataplane';
import i18n from '../i18n';
import { dataplaneApi } from '../services/dataplane';
import type { DataplaneReport } from '../types/dataplane';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const report: DataplaneReport = {
  checked_at: '2026-10-31T00:00:00Z', nodes: [], issues: [],
  components: [
    { id: 'cilium', state: 'available', desired: 1, ready: 1, agents: [] },
    { id: 'xdp', state: 'not_installed', desired: 0, ready: 0, agents: [] },
    { id: 'tetragon', state: 'not_installed', desired: 0, ready: 0, agents: [] },
  ],
  xdp: { state: 'empty', targets: [] },
  lb: { state: 'available', pools: [{ name: 'blue-pool', disabled: false, conflict: false, blocks: ['192.168.2.3 – 192.168.2.100'], total: 98, used: 1, available: 97 }], services: [{ name: 'dvwa', namespace: 'default', addresses: ['192.168.2.3'], ports: ['80/TCP'], state: 'allocated' }] },
};

describe('dataplane navigation', () => {
  it('shows allocated VIPs separately from unconfirmed reachability and connects the runtime tab', async () => {
    await i18n.changeLanguage('zh-CN');
    vi.spyOn(dataplaneApi, 'status').mockResolvedValue(report);
    vi.spyOn(dataplaneApi, 'policies').mockResolvedValue({ items: [{ name: 'external-policy', namespace: 'default', managed: false, kind: 'exec', paths: ['/bin/sh'], pod_labels: { app: 'web' }, enforce: true, execution_state: 'unknown', resource_version: '1' }], possibly_truncated: false });
    vi.spyOn(dataplaneApi, 'events').mockResolvedValue({ events: [], skipped: 0, possibly_truncated: false });
    vi.spyOn(dataplaneApi, 'monitor').mockResolvedValue({ enabled: false, mode: 'observe', checked_at: '', sources: [], profiles: [], findings: [], limitations: [] });
    render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/dataplane?tab=lb']}><Dataplane /></MemoryRouter></I18nextProvider>);
    expect(await screen.findByText('blue-pool')).toBeTruthy();
    expect(screen.getByText('192.168.2.3')).toBeTruthy();
    expect(screen.getByText('已分配')).toBeTruthy();
    expect(screen.getByText('未确认')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Tetragon' }));
    expect(await screen.findByText('external-policy')).toBeTruthy();
    expect(screen.getByText('外部管理 · 只读')).toBeTruthy();
    expect((screen.getByRole('button', { name: '编辑' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '删除' }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(dataplaneApi.policies).toHaveBeenCalledWith('default', expect.any(AbortSignal)));
  });
});
