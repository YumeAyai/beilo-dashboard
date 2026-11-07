// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../i18n';
import type { HubbleFlow } from '../types/hubble';
import { Topology } from './Topology';
const api = vi.hoisted(() => ({ getStatus: vi.fn(), getNamespaces: vi.fn(), getTopology: vi.fn(), getFlows: vi.fn(), streamFlows: vi.fn() }));
vi.mock('../services/api', () => ({ topologyApi: api }));
// These regressions exercise graph lifetime; rendering hundreds of packet rows
// would obscure the collection/retention contract being tested.
vi.mock('../components/Topology/FlowsTable', () => ({ FlowsTable: () => null }));
let onFlow: (flow: HubbleFlow) => void;
let streamState: (state: 'receiving' | 'reconnecting' | 'stopped') => void;
const request: HubbleFlow = {
  source: { id: 1, workloads: [], podName: 'client', namespace: 'default', identity: 100, labels: [] },
  destination: { id: 2, workloads: [], podName: 'api', namespace: 'default', identity: 200, labels: [] },
  l4: { tcp: { sourcePort: 42000, destinationPort: 8080 } }, verdict: 'FORWARDED', reply: false,
  dropReason: 0, type: 'L3_L4', nodeName: 'node-a', sourceNamesList: [], destinationNamesList: [], summary: '', trafficDirection: 'EGRESS', authType: '',
};
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  api.getStatus.mockResolvedValue({ flowsPerSec: 80, nodesConnected: 1, totalNodes: 1 });
  api.getNamespaces.mockResolvedValue(['default']);
  api.getTopology.mockResolvedValue({ nodes: ['client', 'api'].map(name => ({ id: `default/${name}`, label: name, namespace: 'default', type: 'service', ports: [9090] })), edges: [{ source: 'default/client', target: 'default/api' }] });
  api.getFlows.mockResolvedValue([]);
  api.streamFlows.mockImplementation((_ns, _limit, _onFlow, onState) => { onFlow = _onFlow; streamState = onState; return { close: vi.fn() }; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it('ignores a populated topology snapshot when Hubble returns no flows', async () => {
  const view = render(<Topology />);
  await waitFor(() => expect((screen.getByRole('button', { name: /Refresh|刷新/ }) as HTMLButtonElement).disabled).toBe(false));
  expect(api.getFlows).toHaveBeenCalled();
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(0);
  expect(view.container.querySelectorAll('.arrow-body')).toHaveLength(0);
  expect(screen.getByText('No data found to render a service map')).toBeTruthy();
});
it('retains observed topology across transient reconnects, clearing only on authorization stop', async () => {
  api.getFlows.mockResolvedValue([request]);
  const view = render(<Topology />);
  await waitFor(() => expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(2));
  act(() => streamState('reconnecting'));
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(2);
  act(() => streamState('stopped'));
  await waitFor(() => expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(0));
  expect(view.container.querySelectorAll('.arrow-body')).toHaveLength(0);
  expect(screen.getByText('No data found to render a service map')).toBeTruthy();
});
it('does not fall back to resource cards after a Hubble collection error', async () => {
  const error = new Error('relay unavailable');
  api.getFlows.mockRejectedValue(error);
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const view = render(<Topology />);
  await waitFor(() => expect(log).toHaveBeenCalledWith(error));
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(0);
  expect(view.container.querySelectorAll('.arrow-body')).toHaveLength(0);
});


it('keeps a rare connection through 15-second report gaps, table overflow and reconnect replay', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  api.getFlows.mockResolvedValue([request]);
  const view = render(<Topology />);
  await act(async () => {});
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(2);
  const burst = { ...request, source: { ...request.source!, podName: 'busy-client', identity: 300 } };
  const rare = { ...request, source: { ...request.source!, podName: 'rare-client', identity: 400 } };
  act(() => {
    onFlow(rare);
    for (let i = 0; i < 600; i++) onFlow(burst);
    vi.advanceTimersByTime(15000);
  });
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(4);
  const cards = Array.from(view.container.querySelectorAll('.service-map-card'));
  expect(cards.some(card => card.textContent?.includes('rare-client'))).toBe(true);
  const arrows = view.container.querySelectorAll('.arrow-body').length;
  act(() => {
    streamState('reconnecting');
    vi.advanceTimersByTime(15000);
    streamState('receiving');
    onFlow(burst); // Replay contains no rare-client observation.
    vi.advanceTimersByTime(500);
  });
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(4);
  expect(view.container.querySelectorAll('.arrow-body')).toHaveLength(arrows);
  act(() => { onFlow(rare); vi.advanceTimersByTime(15000); });
  expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(4);
});

it('explicit refresh starts an empty collection session when no new flows arrive', async () => {
  api.getFlows.mockResolvedValue([request]);
  const view = render(<Topology />);
  await waitFor(() => expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(2));
  api.getFlows.mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: /Refresh|刷新/ }));
  await waitFor(() => expect(view.container.querySelectorAll('.service-map-card')).toHaveLength(0));
  expect(screen.getByText('No data found to render a service map')).toBeTruthy();
});
