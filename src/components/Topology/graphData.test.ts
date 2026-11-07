import { describe, expect, it } from 'vitest';
import type { HubbleFlow } from '../../types/hubble';
import type { ServiceCardData } from '../ServiceMap/service-map/types';
import { buildHubbleGraph, resolveFlowNode, selectHubbleFlows } from './graphData';

const node = (id: string, data: Partial<ServiceCardData> = {}) => ({ id, data: {
  id, label: id.split('/').at(-1)!, namespace: id.includes('/') ? id.split('/')[0] : '', type: 'service' as const, ...data,
} });
const flow = (source: string, target: string, port: number, options: Partial<HubbleFlow> = {}): HubbleFlow => ({
  source: { podName: source.split('/')[1], namespace: source.split('/')[0], identity: 100, labels: [] },
  destination: { podName: target.split('/')[1], namespace: target.split('/')[0], identity: 200, labels: [] },
  l4: { tcp: { sourcePort: 42000, destinationPort: port } }, verdict: 'FORWARDED', reply: false, ...options,
} as HubbleFlow);

describe('Hubble connection data', () => {
  it('shows no graph without flows, even when resource metadata contains services and ports', () => {
    const nodes = [node('demo/client'), node('demo/api', { ports: [80, 9090] })];
    expect(buildHubbleGraph(nodes, [])).toEqual({ nodes: [], edges: [] });
  });
  it('does not leave cards from metadata that never participate in observed connections', () => {
    const graph = buildHubbleGraph([node('demo/client'), node('demo/api'), node('demo/unused')], [flow('demo/client', 'demo/api', 8080)]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.some(n => n.data.label === 'unused')).toBe(false);
  });
  it('merges pods of the same identity and keeps exact member IDs', () => {
    const graph = buildHubbleGraph([node('demo/client-1'), node('demo/client-2'), node('demo/api')], [flow('demo/client-1', 'demo/api', 8080), flow('demo/client-2', 'demo/api', 8080)]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ destinationPort: 8080, protocol: 'TCP', traffic: 2 });
    expect(graph.nodes.find(n => n.data.identity === 100)?.data.memberNodeIds).toEqual(['demo/client-1', 'demo/client-2']);
  });
  it('excludes replies and ephemeral ports without mutating flows', () => {
    const request = flow('demo/client', 'demo/api', 8080);
    const reply = flow('demo/api', 'demo/client', 42000, { source: request.destination, destination: request.source, reply: true });
    const graph = buildHubbleGraph([node('demo/client', { ports: [42000] }), node('demo/api')], [request, reply]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes.find(n => n.data.identity === 100)?.data.ports).toEqual([]);
    expect(graph.nodes.find(n => n.data.identity === 200)?.data.ports).toEqual([8080]);
    expect(reply.reply).toBe(true);
    expect(buildHubbleGraph([], [reply])).toEqual({ nodes: [], edges: [] });
  });
  it('shows no graph for trace/translation-only observations', () => {
    const samples = ['TRACED', 'TRANSLATED'].map(verdict => flow('demo/client', 'demo/api', 53, { verdict }));
    expect(buildHubbleGraph([node('demo/client'), node('demo/api')], samples)).toEqual({ nodes: [], edges: [] });
  });
  it('adds new services from collected flow endpoints without a metadata snapshot', () => {
    const graph = buildHubbleGraph([], [flow('demo/new-client', 'demo/new-api', 8080)]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });
  it('preserves independent initiated connections in both directions', () => {
    const a = flow('demo/client', 'demo/api', 8080);
    const b = flow('demo/api', 'demo/client', 9090, { source: a.destination, destination: a.source });
    expect(buildHubbleGraph([], [a, b]).edges).toHaveLength(2);
  });
  it('separates World ingress and egress from actual request flows', () => {
    const api = flow('demo/client', 'demo/api', 8080).destination;
    const world = { identity: 2, labels: ['reserved:world'], namespace: '', podName: '' } as HubbleFlow['source'];
    const graph = buildHubbleGraph([], [
      flow('demo/client', 'demo/api', 8080, { source: world, destination: api }),
      flow('demo/api', 'demo/client', 443, { source: api, destination: world }),
    ]);
    expect(graph.nodes.filter(n => n.data.isWorld).map(n => n.id).sort()).toEqual(['reserved:world:receiver', 'reserved:world:sender']);
  });
  it('matches complete namespace/pod IDs and keeps identities scoped', () => {
    const sample = flow('other/client', 'other/api', 8080);
    expect(resolveFlowNode(sample.source, new Set(['demo/client']))).toBeUndefined();
    expect(buildHubbleGraph([], [sample, flow('demo/client', 'demo/api', 8080)]).nodes).toHaveLength(4);
  });
  it('does not leave a floating pod card when Visual hides its only Host connection', () => {
    const host = { identity: 1, labels: ['reserved:host'] } as HubbleFlow['source'];
    const probe = flow('demo/client', 'demo/api', 3101, { source: host });
    const filtered = selectHubbleFlows([probe], {});
    expect(filtered).toEqual([]);
    expect(buildHubbleGraph([node('demo/api')], filtered)).toEqual({ nodes: [], edges: [] });
    expect(buildHubbleGraph([], selectHubbleFlows([probe], { showHost: true })).nodes).toHaveLength(2);
  });
  it('identifies remote nodes by Hubble reserved labels without hiding the API server identity', () => {
    const api = flow('demo/client', 'demo/api', 6443, { source: { identity: 7, labels: ['reserved:kube-apiserver'] } as HubbleFlow['source'] });
    const remote = flow('demo/client', 'demo/api', 6443, { source: { identity: 6, labels: ['reserved:remote-node'] } as HubbleFlow['source'] });
    expect(selectHubbleFlows([api, remote], {})).toEqual([api]);
  });
  it('shares filtering across graph and table while keeping both endpoints of a text match', () => {
    const samples = [flow('demo/client', 'demo/api', 8080)];
    expect(buildHubbleGraph([], selectHubbleFlows(samples, { filterText: 'client' })).nodes).toHaveLength(2);
    expect(buildHubbleGraph([], selectHubbleFlows(samples, { verdictFilter: 'dropped' })).nodes).toEqual([]);
    expect(buildHubbleGraph([], selectHubbleFlows(samples, { filterText: 'absent' })).nodes).toEqual([]);
  });
});
