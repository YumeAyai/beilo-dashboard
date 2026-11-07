// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { NetworkObservations } from './NetworkObservations';
import { dataplaneApi } from '../../services/dataplane';
import i18n from '../../i18n';
import { runtimeNetworkLocales } from '../../i18n/runtimeNetwork';
import type { RuntimeNetworkSnapshot } from '../../types/dataplane';
const snapshot: RuntimeNetworkSnapshot = { state: 'degraded', scope: 'cilium_observed_flows', checked_at: '', last_event_at: '', last_interrupted_at: '', stream_gaps: 1, node_status: 'partial', nodes_connected: 1, total_nodes: 2, samples: 2, truncated: false, retention_seconds: 600, capacity: 2000, evicted: 0, lossless: false, payload_captured: false, protocols: { UDP: 1, ICMPv4: 1 }, events: [
 { id: 'udp-1', time: '2026-11-03T10:00:00Z', node: 'node-a', protocol: 'UDP', source_ip: '192.0.2.1', destination_ip: '10.0.0.2', source_port: 40000, destination_port: 53, destination_namespace: 'apps', destination_pod: 'dns', verdict: 'FORWARDED' },
 { id: 'icmp-1', time: '2026-11-03T10:00:01Z', node: 'node-a', protocol: 'ICMPv4', source_ip: '192.0.2.2', destination_ip: '10.0.0.2', icmp_type: 8, icmp_code: 0, verdict: 'DROPPED' },
], limitations: [], context_coverage: { enabled: true, model: '', namespaces: [{ namespace: 'apps', state: 'configured', policies: ['tcp', 'udp'], sensor_state: 'unverified', checked_at: '' }] } };
beforeEach(async () => { await i18n.changeLanguage('en-US'); vi.spyOn(dataplaneApi, 'network').mockResolvedValue(snapshot); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount() { render(<I18nextProvider i18n={i18n}><NetworkObservations autoRefresh={false} /></I18nextProvider>); }
describe('network metadata observation', () => {
 it('shows UDP and ICMP metadata, gaps and desired coverage without claiming packet completeness', async () => {
  mount(); await screen.findByRole('table', { name: 'Network observation' });
  expect(screen.getByText('192.0.2.1:40000')).toBeTruthy(); expect(screen.getByText('192.0.2.2')).toBeTruthy();
  expect(screen.getByText(/stream has gaps/)).toBeTruthy(); expect(screen.getByText('apps: Policies configured')).toBeTruthy();
  expect(screen.getByText(/not a complete packet capture/)).toBeTruthy(); expect(screen.getByText(/loading still requires verification/)).toBeTruthy();
  fireEvent.click(screen.getByText('UDP: 1'));
  await waitFor(() => expect(dataplaneApi.network).toHaveBeenLastCalledWith('', 'UDP', expect.any(AbortSignal)));
 });
 it('keeps an unavailable observation unknown', async () => {
  vi.mocked(dataplaneApi.network).mockRejectedValue(new Error('offline')); mount();
  expect(await screen.findByText(/Network observations could not be loaded/)).toBeTruthy(); expect(screen.queryByText('Connected nodes: 0 / 0')).toBeNull();
 });
 it('provides the same complete translation keys in four languages', () => {
  const keys = Object.keys(runtimeNetworkLocales['en-US']).sort();
  for (const lang of ['zh-CN', 'zh-TW', 'ja-JP'] as const) expect(Object.keys(runtimeNetworkLocales[lang]).sort()).toEqual(keys);
 });
});
