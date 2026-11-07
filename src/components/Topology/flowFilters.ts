import type { Endpoint, HubbleFlow, TCPFlags } from '../../types/hubble';
import { normalizeKey } from '../../utils/labels';

export type FlowFilterKind = 'label' | 'ip' | 'dns' | 'identity' | 'workload' | 'tcp-flag' | 'pod';
export type FlowFilterDirection = 'from' | 'to' | 'either';
export interface FlowFilter {
  kind: FlowFilterKind;
  direction: FlowFilterDirection;
  query: string;
  negative: boolean;
}

const kinds = new Set<FlowFilterKind>(['label', 'ip', 'dns', 'identity', 'workload', 'tcp-flag', 'pod']);
const workloadAliases: Record<string, string> = { deployment: 'deploy', deployments: 'deploy', dep: 'deploy', daemonset: 'ds', daemonsets: 'ds', statefulset: 'sts', statefulsets: 'sts', replicaset: 'rs', replicasets: 'rs', cronjob: 'cj', cronjobs: 'cj' };
const workloadKind = (kind: string) => workloadAliases[kind.toLowerCase()] ?? kind.toLowerCase();

export function createFlowFilter(kind: FlowFilterKind, query: string, direction: FlowFilterDirection = 'either', negative = false): FlowFilter {
  query = query.trim();
  if (kind === 'label' && !query.split('=')[0].includes(':')) query = `k8s:${query}`;
  if (kind === 'tcp-flag') query = query.toLowerCase();
  return { kind, query, direction, negative };
}

// Hubble syntax: [!][from:|to:|either:][kind=]value; bare key=value is a label.
export function parseFlowFilter(input: string): FlowFilter | null {
  let rest = input.trim();
  const negative = rest.startsWith('!');
  if (negative) rest = rest.slice(1);
  let direction: FlowFilterDirection = 'either';
  const prefix = rest.match(/^(from|to|either):/);
  if (prefix) { direction = prefix[1] as FlowFilterDirection; rest = rest.slice(prefix[0].length); }
  const equal = rest.indexOf('=');
  const kind = rest.slice(0, equal) as FlowFilterKind;
  const explicit = equal >= 0 && kinds.has(kind);
  const query = (explicit ? rest.slice(equal + 1) : rest).trim();
  if (!query) return null;
  return createFlowFilter(explicit ? kind : 'label', query, direction, negative);
}

export function flowFilterKey(filter: FlowFilter): string {
  return `${filter.negative ? '!' : ''}${filter.direction}:${filter.kind}=${filter.query}`;
}

export function formatFlowFilter(filter: FlowFilter): string {
  const query = filter.kind === 'label' ? filter.query.replace(/^k8s:/, '') : filter.query;
  return `${filter.negative ? '!' : ''}${filter.direction === 'either' ? '' : `${filter.direction}:`}${filter.kind}=${query}`;
}

export function uniqueFlowFilters(filters: FlowFilter[]): FlowFilter[] {
  return [...new Map(filters.map(filter => [flowFilterKey(filter), filter])).values()];
}

export function isFlowFilterSelected(filters: FlowFilter[], kind: FlowFilterKind, query: string, direction: FlowFilterDirection = 'either') {
  const expected = createFlowFilter(kind, query, direction);
  return filters.some(filter => !filter.negative && filter.kind === kind && filter.query === expected.query
    && (direction === 'either' || filter.direction === 'either' || filter.direction === direction));
}

function endpointMatches(flow: HubbleFlow, endpoint: Endpoint | undefined, filter: FlowFilter, source: boolean): boolean {
  const { kind, query } = filter;
  switch (kind) {
    case 'label': {
      const [key, ...value] = query.split('=');
      const normalized = normalizeKey(key);
      if (normalized === 'namespace' && endpoint?.namespace && (!value.length || endpoint.namespace === value.join('='))) return true;
      return !!endpoint?.labels?.some(label => {
        const [candidate, ...rest] = label.split('=');
        return normalizeKey(candidate) === normalized && (!value.length || rest.join('=') === value.join('='));
      });
    }
    case 'ip': return (source ? flow.ip?.source : flow.ip?.destination) === query;
    case 'dns': return (source ? flow.sourceNamesList : flow.destinationNamesList)?.includes(query) ?? false;
    case 'identity': return endpoint?.identity !== undefined && String(endpoint.identity) === query;
    case 'pod': return !!endpoint?.podName && (query.includes('/') ? `${endpoint.namespace}/${endpoint.podName}` : endpoint.podName) === query;
    case 'workload': {
      const separator = query.search(/[:/]/);
      const kind = separator < 0 ? '' : workloadKind(query.slice(0, separator));
      const name = separator < 0 ? query : query.slice(separator + 1);
      return !!endpoint?.workloads?.some(workload => workload.name.toLowerCase() === name.toLowerCase() && (!kind || workloadKind(workload.kind) === kind));
    }
    case 'tcp-flag': return !!flow.l4?.tcp?.flags?.[query as keyof TCPFlags];
  }
}

export function matchesFlowFilter(flow: HubbleFlow, filter: FlowFilter): boolean {
  const matched = (filter.direction !== 'to' && endpointMatches(flow, flow.source, filter, true))
    || (filter.direction !== 'from' && endpointMatches(flow, flow.destination, filter, false));
  return filter.negative ? !matched : matched;
}

export function matchesFlowFilters(flow: HubbleFlow, filters: FlowFilter[]): boolean {
  const included = filters.filter(filter => !filter.negative);
  return filters.filter(filter => filter.negative).every(filter => matchesFlowFilter(flow, filter))
    && (!included.length || included.some(filter => matchesFlowFilter(flow, filter)));
}

export function collectFlowFilterSuggestions(flows: HubbleFlow[]): string[] {
  const suggestions = new Set<string>();
  const add = (kind: FlowFilterKind, query: string) => { if (query) suggestions.add(formatFlowFilter(createFlowFilter(kind, query))); };
  for (const flow of flows) {
    for (const endpoint of [flow.source, flow.destination]) {
      if (!endpoint) continue;
      endpoint.labels?.forEach(label => add('label', label));
      if (endpoint.namespace) add('label', `io.kubernetes.pod.namespace=${endpoint.namespace}`);
      if (endpoint.podName) add('pod', endpoint.namespace ? `${endpoint.namespace}/${endpoint.podName}` : endpoint.podName);
      if (endpoint.identity !== undefined) add('identity', String(endpoint.identity));
      endpoint.workloads?.forEach(workload => add('workload', `${workload.kind}:${workload.name}`));
    }
    add('ip', flow.ip?.source ?? ''); add('ip', flow.ip?.destination ?? '');
    [...(flow.sourceNamesList ?? []), ...(flow.destinationNamesList ?? [])].forEach(name => add('dns', name));
    Object.entries(flow.l4?.tcp?.flags ?? {}).forEach(([flag, enabled]) => { if (enabled) add('tcp-flag', flag); });
  }
  return [...suggestions].sort();
}
