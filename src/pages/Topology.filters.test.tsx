// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import type { HubbleFlow } from '../types/hubble';
import type { FlowData } from '../components/Topology/flowData';
import type { ServiceMapNode } from '../components/ServiceMap/service-map/types';
import { Topology } from './Topology';

const api = vi.hoisted(() => ({ getStatus: vi.fn(), getNamespaces: vi.fn(), getTopology: vi.fn(), getFlows: vi.fn(), streamFlows: vi.fn() }));
vi.mock('../services/api', () => ({ topologyApi: api }));
vi.mock('../components/Topology/ServiceMapCanvas', () => ({ ServiceMapCanvas: ({ nodes, onNodeClick }: { nodes: ServiceMapNode[]; onNodeClick: (data: ServiceMapNode['data']) => void }) =>
  <div data-testid="map">{nodes.map(node => <button key={node.id} onClick={() => onNodeClick(node.data)}>Node {node.data.label}</button>)}</div> }));
vi.mock('../components/Topology/FlowsTable', () => ({ FlowsTable: ({ flows, onFlowSelect }: { flows: FlowData[]; onFlowSelect: (flow: FlowData) => void }) =>
  <div data-testid="flows">{flows.map(flow => <button key={flow.id} onClick={() => onFlowSelect(flow)}>{flow.sourcePod} → {flow.destinationPod}</button>)}</div> }));

const endpoint = (podName: string, identity: number, app: string) => ({ id: identity, identity, namespace: 'default', podName, labels: [`k8s:app=${app}`], workloads: [] });
const packets = [
  { source: endpoint('other', 300, 'other'), destination: endpoint('worker', 400, 'worker') },
  { source: endpoint('client', 100, 'web'), destination: endpoint('api', 200, 'api') },
  { source: endpoint('client', 100, 'web'), destination: endpoint('database', 500, 'db') },
].map((endpoints, index) => ({ ...endpoints, time: { seconds: 100 + index, nanos: 0 }, verdict: 'FORWARDED', reply: false,
  l4: { tcp: { sourcePort: 40000 + index, destinationPort: 8080 } }, sourceNamesList: [], destinationNamesList: [],
  dropReason: 0, type: 'L3_L4', nodeName: 'node-a', summary: '', trafficDirection: 'EGRESS', authType: '',
} satisfies HubbleFlow));

beforeEach(async () => {
  await i18n.changeLanguage('en-US');
  api.getStatus.mockResolvedValue(null); api.getNamespaces.mockResolvedValue(['default']);
  api.getTopology.mockResolvedValue({ nodes: [], edges: [] }); api.getFlows.mockResolvedValue(packets);
  api.streamFlows.mockReturnValue({ close: vi.fn() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('automatically adds and toggles a card identity filter, updating the map and flow list without reconnecting', async () => {
  render(<Topology />);
  await screen.findByRole('button', { name: 'Node client' });
  fireEvent.click(screen.getByRole('button', { name: 'Node client' }));
  expect(screen.getByTitle('identity=100')).toBeTruthy();
  expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Node other' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Node client' }));
  expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(3);
  expect(screen.queryByTitle('identity=100')).toBeNull();
  expect(api.getFlows).toHaveBeenCalledTimes(1);
  expect(api.streamFlows).toHaveBeenCalledTimes(1);
});

it('carries the destination direction into the top filter and keeps the same flow details after row positions change', async () => {
  render(<Topology />);
  fireEvent.click(await screen.findByRole('button', { name: 'client → api' }));
  fireEvent.click(screen.getByText('default/api'));
  expect(screen.getByTitle('to:pod=default/api')).toBeTruthy();
  expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(1);
  expect(screen.getByText('Flow Details')).toBeTruthy();
  fireEvent.click(screen.getByText('default/api'));
  await waitFor(() => expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(3));
  fireEvent.click(screen.getByRole('button', { name: 'k8s:app=web' }));
  expect(screen.getByTitle('from:label=app=web')).toBeTruthy();
  expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(3);
});

it('keeps a matching packet on the map when connection history coalesced a different TCP flag', async () => {
  const packet = packets[1];
  const baseFlags = { fin: false, syn: false, rst: false, psh: false, ack: false, urg: false, ece: false, cwr: false, ns: false };
  api.getFlows.mockResolvedValue([
    { ...packet, l4: { tcp: { ...packet.l4.tcp, flags: { ...baseFlags, ack: true } } } },
    { ...packet, l4: { tcp: { ...packet.l4.tcp, flags: { ...baseFlags, syn: true } } } },
  ]);
  render(<Topology />);
  await screen.findByRole('button', { name: 'Node client' });
  const input = screen.getByRole('combobox', { name: 'Flow filters' });
  fireEvent.change(input, { target: { value: 'from:tcp-flag=syn' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(within(screen.getByTestId('flows')).getAllByRole('button')).toHaveLength(1);
  expect(within(screen.getByTestId('map')).getAllByRole('button')).toHaveLength(2);
});
