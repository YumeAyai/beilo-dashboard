// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { ClusterManagement } from './ClusterManagement';
import { clusterApi } from '../services/cluster';
import type { ClusterReport, IPPool } from '../types/cluster';
import { clusterManagementLocales } from '../i18n/clusterManagement';
import i18n from '../i18n';

configure({ asyncUtilTimeout: 5000 });
beforeEach(async () => {
  let version = 10;
  const pools: IPPool[] = [
    { name: 'gateway-pool', resource_version: '1', blocks: [{ start: '192.168.2.3', stop: '192.168.2.100' }], disabled: false, service_selector: null, allow_first_last_ips: '', conflict: false, total: 98, used: 2, available: 96, services: ['default/cilium-ingress-web', 'default/cilium-gateway-api'] },
    { name: 'internal-pool', resource_version: '2', blocks: [{ cidr: '10.30.0.0/24' }], disabled: true, service_selector: { matchLabels: { exposure: 'internal' } }, allow_first_last_ips: 'No', conflict: false, total: 254, used: 0, available: 254, services: [] },
  ];
  const at = (minutes = 0) => new Date(Date.now() - minutes * 60_000).toISOString();
  vi.spyOn(clusterApi, 'status').mockResolvedValue({
    checked_at: at(), can_manage_pools: true, issues: [],
    components: [{ id: 'cilium', state: 'available', desired: 3, ready: 3, agents: [{ namespace: 'kube-system', name: 'cilium', desired: 3, ready: 3, observed: true }] }, { id: 'xdp', state: 'not_installed', desired: 0, ready: 0, agents: [] }],
    nodes: [
      { name: 'worker-01', internal_ip: '192.168.3.48', kernel: '6.12.0', state: 'ready', last_heartbeat: at() },
      { name: 'worker-02', internal_ip: '192.168.3.49', kernel: '6.12.0', state: 'ready', last_heartbeat: at() },
      { name: 'worker-03', internal_ip: '192.168.3.50', kernel: '6.12.0', state: 'stale', last_heartbeat: at(15) },
    ],
    node_details: ['worker-01', 'worker-02', 'worker-03'].map(name => ({ name, os: 'Debian GNU/Linux 13', architecture: 'amd64', kubelet: 'v1.29.9', unschedulable: name === 'worker-03', allocatable: { cpu: '8', memory: '16Gi', pods: '110' }, conditions: { MemoryPressure: 'False', DiskPressure: name === 'worker-03' ? 'True' : 'False', PIDPressure: 'False' } })),
    network: { namespace: 'kube-system', config_state: 'available', workload_state: 'available', config: { 'routing-mode': 'tunnel', 'tunnel-protocol': 'vxlan', 'kube-proxy-replacement': 'true', 'bpf-lb-acceleration': 'disabled', 'enable-l7-proxy': 'true', 'enable-l2-announcements': 'false', 'enable-bgp-control-plane': 'false' }, workloads: [
      { name: 'cilium', namespace: 'kube-system', kind: 'DaemonSet', images: ['quay.io/cilium/cilium:v1.18.6'], desired: 3, ready: 3, observed: true },
      { name: 'cilium-operator', namespace: 'kube-system', kind: 'Deployment', images: ['quay.io/cilium/operator-generic:v1.18.6'], desired: 1, ready: 1, observed: true },
      { name: 'cilium-envoy', namespace: 'kube-system', kind: 'DaemonSet', images: ['quay.io/cilium/cilium-envoy:v1.34.12'], desired: 3, ready: 3, observed: true },
    ] },
    xdp: { state: 'unconfigured', targets: [] },
    lb: { state: 'available', pools: pools.map(pool => ({ name: pool.name, disabled: pool.disabled, conflict: pool.conflict, blocks: pool.blocks.map(block => block.cidr || `${block.start} - ${block.stop}`), total: pool.total, used: pool.used, available: pool.available })), services: [
      { name: 'cilium-ingress-web', namespace: 'default', addresses: ['192.168.2.3'], ports: ['80/TCP', '443/TCP'], state: 'allocated' },
      { name: 'cilium-gateway-api', namespace: 'default', addresses: ['192.168.2.6'], ports: ['80/TCP'], state: 'allocated' },
      { name: 'pending-gateway', namespace: 'staging', addresses: [], ports: ['443/TCP'], state: 'pending' },
    ] },
  } satisfies ClusterReport);
  vi.spyOn(clusterApi, 'pools').mockImplementation(async () => ({ items: structuredClone(pools) }));
  vi.spyOn(clusterApi, 'savePool').mockImplementation(async (input, create) => {
    const index = pools.findIndex(pool => pool.name === input.name);
    const pool: IPPool = { ...(index >= 0 ? pools[index] : { total: null, used: 0, available: null, conflict: false, services: [] }), ...input, resource_version: String(++version) };
    if (create) pools.push(pool); else pools[index] = pool;
    return structuredClone(pool);
  });
  vi.spyOn(clusterApi, 'deletePool').mockImplementation(async target => {
    const index = pools.findIndex(pool => pool.name === target.name);
    pools.splice(index, 1);
  });
  await i18n.changeLanguage('en-US');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount(tab = 'overview') { render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[`/cluster?tab=${tab}`]}><ClusterManagement /></MemoryRouter></I18nextProvider>); }
function poolRow(name: string) { return screen.getByRole('button', { name }).closest('tr')!; }

describe('cluster management workflows', { timeout: 30_000 }, () => {
  it('navigates nodes, Cilium settings and separate XDP components without presenting desired settings as active', async () => {
    mount('nodes');
    const nodes = await screen.findByRole('table', { name: 'Nodes' });
    const row = within(nodes).getByText('worker-03').closest('tr')!;
    expect(within(row).getByText('Stale heartbeat')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Details' }));
    const detail = await screen.findByRole('dialog');
    expect(within(detail).getByText('Pressure detected')).toBeTruthy();
    expect(within(detail).getByText('Cordoned')).toBeTruthy();
    fireEvent.click(within(detail).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('tab', { name: 'Cilium networking' }));
    expect(await screen.findByText('kube-system/cilium-operator')).toBeTruthy();
    expect(screen.getByText(/Per-node activation is unconfirmed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'XDP' }));
    expect(screen.getByText('Cilium native XDP')).toBeTruthy();
    expect(screen.getByText('Beilo XDP agent (optional)')).toBeTruthy();
    expect(screen.getByText('disabled')).toBeTruthy();
    expect(screen.getByText('Deployment not found')).toBeTruthy();
    expect(screen.queryByText('Tetragon')).toBeNull();
  });

  it('preserves in-use pool ranges while stopping new allocations, and keeps deletion disabled', async () => {
    const save = vi.spyOn(clusterApi, 'savePool');
    mount('lb');
    await screen.findByRole('button', { name: 'gateway-pool' });
    expect((within(poolRow('gateway-pool')).getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(poolRow('gateway-pool')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit IP pool' });
    expect((within(dialog).getByRole('textbox', { name: /Address ranges/ }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Disable new IP allocations' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'gateway-pool', disabled: true, resource_version: '1', blocks: [{ start: '192.168.2.3', stop: '192.168.2.100' }], service_selector: null, allow_first_last_ips: '' }), false));
    await waitFor(() => expect(within(poolRow('gateway-pool')).getByRole('button', { name: 'Enable allocation' })).toBeTruthy());
    expect((within(poolRow('gateway-pool')).getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('creates a scoped pool and reports concurrent edits without discarding the draft', async () => {
    const save = vi.spyOn(clusterApi, 'savePool').mockRejectedValueOnce(new Error('conflict'));
    mount('lb');
    await screen.findByRole('button', { name: 'internal-pool' });
    fireEvent.click(screen.getByRole('button', { name: 'New IP pool' }));
    const dialog = await screen.findByRole('dialog', { name: 'New IP pool' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Pool name/ }), { target: { value: 'staging-pool' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Address ranges/ }), { target: { value: '10.40.0.0/24\n2001:db8::1 - 2001:db8::10' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Service label selector (JSON)' }), { target: { value: '{"matchLabels":{"env":"staging"}}' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(/Resource changed or name exists/)).toBeTruthy();
    expect((within(dialog).getByRole('textbox', { name: /Pool name/ }) as HTMLInputElement).value).toBe('staging-pool');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'staging-pool', service_selector: { matchLabels: { env: 'staging' } }, blocks: [{ cidr: '10.40.0.0/24' }, { start: '2001:db8::1', stop: '2001:db8::10' }] }), true));
    expect(await screen.findByRole('button', { name: 'staging-pool' })).toBeTruthy();
  });

  it('deletes only an empty disabled pool after review', async () => {
    const remove = vi.spyOn(clusterApi, 'deletePool');
    mount('lb');
    await screen.findByRole('button', { name: 'internal-pool' });
    fireEvent.click(within(poolRow('internal-pool')).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete IP pool' });
    expect(within(dialog).getByText('internal-pool')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(expect.objectContaining({ name: 'internal-pool', resource_version: '2' })));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'internal-pool' })).toBeNull());
  });

  it('disables writes for read-only users and displays partial inventories as unknown counts', async () => {
    const report = await clusterApi.status();
    vi.spyOn(clusterApi, 'status').mockResolvedValue({ ...report, can_manage_pools: false, issues: [{ source: 'nodes', message: 'source_unavailable' }], nodes: [] });
    mount('lb');
    await screen.findByRole('button', { name: 'gateway-pool' });
    expect(screen.getByText('Your account does not have IP pool write permission.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'New IP pool' }) as HTMLButtonElement).disabled).toBe(true);
    const card = screen.getByText('Ready nodes').closest<HTMLElement>('.MuiCard-root')!;
    expect(within(card).getByText('—')).toBeTruthy();
    expect(screen.getByText('Source unavailable: Node inventory')).toBeTruthy();
  });

  it('has native strings in four languages and switches tab content to Japanese', async () => {
    const keys = Object.keys(clusterManagementLocales['en-US']);
    for (const language of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP']) {
      expect(Object.keys(clusterManagementLocales[language]).sort()).toEqual([...keys].sort());
      for (const key of keys) expect(typeof i18n.getResource(language, 'translation', `clusterManagement.${key}`)).toBe('string');
    }
    mount('xdp');
    await screen.findByText('Cilium native XDP');
    await act(async () => { await i18n.changeLanguage('ja-JP'); });
    expect(screen.getByRole('heading', { name: 'クラスター管理' })).toBeTruthy();
    expect(screen.getByText('Beilo XDP エージェント（任意）')).toBeTruthy();
  });
});
