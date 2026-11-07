import { describe, expect, it } from 'vitest';
import type { HubbleFlow } from '../../types/hubble';
import { collectFlowFilterSuggestions, flowFilterKey, formatFlowFilter, matchesFlowFilters, parseFlowFilter, uniqueFlowFilters } from './flowFilters';
import { selectHubbleFlows, buildHubbleGraph } from './graphData';
import { hubbleFlowToFlowData } from './flowData';

const flow: HubbleFlow = {
  source: { id: 1, identity: 100, namespace: 'demo', podName: 'client', labels: ['k8s:app=Web', 'k8s:token=a=b'], workloads: [{ kind: 'Deployment', name: 'frontend' }] },
  destination: { id: 2, identity: 200, namespace: 'prod', podName: 'api', labels: ['k8s:app=api'], workloads: [] },
  ip: { source: '192.0.2.1', destination: '192.0.2.10', ipVersion: 'V4', encrypted: false },
  l4: { tcp: { sourcePort: 40000, destinationPort: 8080, flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false, ece: false, cwr: false, ns: false } } },
  verdict: 'FORWARDED', reply: false, sourceNamesList: [], destinationNamesList: ['api.example.com'],
  dropReason: 0, type: 'L3_L4', nodeName: 'node-a', summary: '', trafficDirection: 'EGRESS', authType: '',
};
const filters = (...inputs: string[]) => inputs.map(input => parseFlowFilter(input)!);

describe('Hubble filter entries', () => {
  it('parses label shorthand, directions, negation and values containing equals or colons', () => {
    expect(parseFlowFilter('!from:token=a=b')).toEqual({ kind: 'label', query: 'k8s:token=a=b', direction: 'from', negative: true });
    expect(parseFlowFilter('to:ip=2001:db8::1')?.query).toBe('2001:db8::1');
    expect(parseFlowFilter('label=reserved:world')?.query).toBe('reserved:world');
    expect(parseFlowFilter('pod=')).toBeNull();
    const parsed = filters('app=Web', 'label=k8s:app=Web');
    expect(uniqueFlowFilters(parsed)).toHaveLength(1);
    expect(flowFilterKey(parseFlowFilter(formatFlowFilter(parsed[0]))!)).toBe(flowFilterKey(parsed[0]));
  });

  it.each(['from:app=Web', 'to:pod=prod/api', 'from:identity=100', 'to:ip=192.0.2.10', 'dns=api.example.com', 'workload=dep:frontend', 'tcp-flag=SYN', 'token=a=b', 'io.kubernetes.pod.namespace=prod'])('matches typed entry %s', input => {
    expect(matchesFlowFilters(flow, filters(input))).toBe(true);
  });

  it.each(['to:app=Web', 'from:app=web', 'pod=demo/api', 'ip=192.0.2.100', 'identity=10', 'tcp-flag=ack', 'dns=example.com'])('rejects the wrong direction, scope or partial value: %s', input => {
    expect(matchesFlowFilters(flow, filters(input))).toBe(false);
  });

  it('combines positive alternatives and applies exclusions regardless of entry order, including exclusion-only queries', () => {
    expect(matchesFlowFilters(flow, filters('pod=missing', 'identity=100'))).toBe(true);
    expect(matchesFlowFilters(flow, filters('identity=100', '!to:app=api'))).toBe(false);
    expect(matchesFlowFilters(flow, filters('!to:app=api', 'identity=100'))).toBe(false);
    expect(matchesFlowFilters(flow, filters('!identity=999'))).toBe(true);
  });

  it('offers deduplicated collected endpoint metadata and shares filtering between the map and packet list', () => {
    const suggestions = collectFlowFilterSuggestions([flow, flow]);
    expect(suggestions).toContain('label=app=Web');
    expect(suggestions).toContain('pod=prod/api');
    expect(suggestions).toContain('dns=api.example.com');
    expect(suggestions.length).toBe(new Set(suggestions).size);
    const selected = selectHubbleFlows([flow], { flowFilters: filters('from:app=Web') });
    expect(selected).toEqual([flow]);
    expect(buildHubbleGraph([], selected).nodes).toHaveLength(2);
    expect(buildHubbleGraph([], selectHubbleFlows([flow], { flowFilters: filters('to:app=Web') })).nodes).toHaveLength(0);
  });

  it('keeps a packet row ID stable when filtering or insertion changes its index', () => {
    const first = hubbleFlowToFlowData(flow);
    const another = { ...flow };
    const rows = [another, flow].map(hubbleFlowToFlowData);
    expect(rows[1].id).toBe(first.id);
    expect(rows[0].id).not.toBe(first.id);
    expect([flow].map(hubbleFlowToFlowData)[0].id).toBe(first.id);
  });
});
