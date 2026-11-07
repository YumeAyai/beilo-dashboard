import type { Endpoint, HubbleFlow } from '../../types/hubble';
import type { AccessPoint, ServiceCardData, ServiceMapEdge, Verdict } from '../ServiceMap/service-map/types';
import { matchesFlowFilters, type FlowFilter } from './flowFilters';

type Node = { id: string; data: ServiceCardData };
const verdict = (value?: string): Verdict | undefined => {
  const v = value?.toLowerCase();
  return v === 'forwarded' || v === 'dropped' || v === 'denied' || v === 'audit' ? v : undefined;
};

// Match the IDs returned by Beilo's resolveEndpoint, including namespaced pods.
// Never match by a substring of a pod name: identical names in two namespaces
// and reserved identities must remain separate.
export function resolveFlowNode(endpoint: Endpoint | undefined, ids: ReadonlySet<string>): string | undefined {
  if (!endpoint) return;
  const labels = endpoint.labels ?? [];
  const candidates = [
    labels.includes('reserved:host') ? 'reserved:host' : '',
    labels.some(l => l.startsWith('reserved:world')) ? 'reserved:world' : '',
    endpoint.namespace && endpoint.podName ? `${endpoint.namespace}/${endpoint.podName}` : '',
    endpoint.identity > 0 ? `identity-${endpoint.identity}` : '',
  ];
  return candidates.find(id => id && ids.has(id));
}

export function isHubbleRequestFlow(flow: HubbleFlow): boolean {
  return !flow.reply && !['traced', 'translated'].includes(flow.verdict?.toLowerCase());
}

export interface HubbleFlowFilters {
  showHost?: boolean;
  showKubeDns?: boolean;
  showRemoteNode?: boolean;
  showPrometheusApp?: boolean;
  filterText?: string;
  flowFilters?: FlowFilter[];
  verdictFilter?: string;
  httpStatus?: string;
}

// Apply filters to flows before building either view. A hidden connection must
// not leave its other endpoint or a service port floating on an empty map.
export function selectHubbleFlows(flows: HubbleFlow[], filters: HubbleFlowFilters): HubbleFlow[] {
  return flows.filter(flow => {
    if (!isHubbleRequestFlow(flow)) return false;
    const endpoints = [flow.source, flow.destination];
    const text = `${endpoints.map(endpoint => `${endpoint?.namespace}/${endpoint?.podName} ${endpoint?.labels?.join(' ')} ${endpoint?.workloads?.map(w => w.name).join(' ')} ${endpoint?.identity}`).join(' ')} ${flow.sourceService?.name} ${flow.destinationService?.name} ${flow.sourceNamesList?.join(' ')} ${flow.destinationNamesList?.join(' ')} ${flow.ip?.source} ${flow.ip?.destination}`.toLowerCase();
    if (!filters.showHost && (endpoints.some(e => e?.identity === 1) || text.includes('reserved:host'))) return false;
    if (!filters.showKubeDns && /kube-dns|coredns/.test(text)) return false;
    if (!filters.showRemoteNode && text.includes('reserved:remote-node')) return false;
    if (!filters.showPrometheusApp && /prometheus/.test(text)) return false;
    if (filters.verdictFilter && filters.verdictFilter !== 'all' && flow.verdict.toLowerCase() !== filters.verdictFilter) return false;
    if (filters.filterText && !text.includes(filters.filterText.toLowerCase())) return false;
    if (filters.flowFilters && !matchesFlowFilters(flow, filters.flowFilters)) return false;
    if (filters.httpStatus) {
      const code = flow.l7?.http?.code;
      const query = filters.httpStatus.trim().toLowerCase();
      if (code === undefined || (/^[1-5]xx$/.test(query) ? Math.floor(code / 100) !== Number(query[0]) : String(code) !== query)) return false;
    }
    return true;
  });
}

// Hubble's service IDs use the security identity for in-cluster endpoints and
// separate World sender/receiver cards. Only collected request flows create cards.
export function buildHubbleGraph(nodes: Node[], flows: HubbleFlow[]): { nodes: Node[]; edges: ServiceMapEdge[] } {
  flows = flows.filter(isHubbleRequestFlow);
  if (!flows.length) return { nodes: [], edges: [] };
  // A service may appear in the live stream after the topology snapshot.
  // Materialize its endpoint rather than silently dropping the new connection.
  nodes = [...nodes];
  const known = new Set(nodes.map(n => n.id));
  flows.forEach(flow => [flow.source, flow.destination].forEach(endpoint => {
    if (!endpoint || resolveFlowNode(endpoint, known)) return;
    const labels = endpoint.labels ?? [];
    const isHost = labels.includes('reserved:host');
    const isWorld = labels.some(l => l.startsWith('reserved:world'));
    const id = isHost ? 'reserved:host' : isWorld ? 'reserved:world'
      : endpoint.namespace && endpoint.podName ? `${endpoint.namespace}/${endpoint.podName}`
      : endpoint.identity > 0 ? `identity-${endpoint.identity}` : '';
    if (!id || known.has(id)) return;
    known.add(id);
    nodes.push({ id, data: { id, label: isHost ? 'Host' : isWorld ? 'World' : endpoint.workloads?.[0]?.name || endpoint.podName || String(endpoint.identity),
      namespace: endpoint.namespace || '', type: isHost ? 'host' : isWorld ? 'world' : 'service', isHost, isWorld,
      identity: endpoint.identity, labels: labels.map(label => { const [key, ...value] = label.split('='); return { key, value: value.join('=') }; }),
    } });
  }));
  const originals = new Map(nodes.map(n => [n.id, n]));
  const ids = new Set(originals.keys());
  const identities = new Map<string, number>();
  const requests: Array<{ source: string; target: string; flow: HubbleFlow }> = [];
  flows.forEach(flow => {
    const source = resolveFlowNode(flow.source, ids), target = resolveFlowNode(flow.destination, ids);
    if (source && flow.source!.identity > 0) identities.set(source, flow.source!.identity);
    if (target && flow.destination!.identity > 0) identities.set(target, flow.destination!.identity);
    if (!source || !target) return;
    requests.push({ source, target, flow });
  });

  const groups = new Map<string, { node: Node; members: Set<string>; aps: Map<string, AccessPoint> }>();
  const groupId = (id: string, side: 'sender' | 'receiver') => {
    const node = originals.get(id)!;
    if (node.data.isWorld || node.data.type === 'world') return `${id}:${side}`;
    const identity = identities.get(id) ?? node.data.identity;
    return identity ? `identity:${node.data.namespace}:${identity}` : id;
  };
  const upsert = (id: string, side: 'sender' | 'receiver') => {
    const original = originals.get(id)!;
    const key = groupId(id, side);
    let group = groups.get(key);
    if (!group) {
      group = { node: { id: key, data: { ...original.data, id: key, identity: identities.get(id) ?? original.data.identity } }, members: new Set(), aps: new Map() };
      groups.set(key, group);
    }
    group.members.add(id);
    return group;
  };
  const links = new Map<string, ServiceMapEdge>();
  const insert = (sourceId: string, targetId: string, port: number | undefined, protocol: string | undefined, value: string | undefined, traffic: number) => {
    const source = upsert(sourceId, 'sender').node.id;
    const target = upsert(targetId, 'receiver').node.id;
    const key = JSON.stringify([source, target, port ?? null, protocol ?? null]);
    const existing = links.get(key);
    const v = verdict(value);
    if (existing) {
      existing.traffic = (existing.traffic ?? 0) + traffic;
      if (v === 'dropped' || v === 'denied' || !existing.verdict) existing.verdict = v;
    } else links.set(key, { id: key, source, target, destinationPort: port, protocol, verdict: v, traffic });
  };
  requests.forEach(({ source, target, flow }) => {
    const transport = flow.l4?.tcp ?? flow.l4?.udp;
    const port = transport?.destinationPort || undefined;
    const protocol = flow.l4?.tcp ? 'TCP' : flow.l4?.udp ? 'UDP' : undefined;
    insert(source, target, port, protocol, flow.verdict, 1);
    if (port && protocol) {
      const group = upsert(target, 'receiver');
      const l7Protocol = flow.l7?.http ? 'HTTP' : flow.l7?.dns ? 'DNS' : flow.l7?.kafka ? 'KAFKA' : undefined;
      group.aps.set(`${protocol}:${port}`, { port, protocol, l7Protocol });
    }
  });
  groups.forEach(({ node, members, aps }) => {
    node.data.accessPoints = Array.from(aps.values()).sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol));
    node.data.ports = Array.from(new Set(node.data.accessPoints.map(ap => ap.port)));
    node.data.memberNodeIds = Array.from(members).sort();
    node.data.pods = Array.from(members).reduce((sum, id) => sum + (originals.get(id)!.data.pods ?? 1), 0);
    if (members.size > 1) {
      const app = node.data.labels?.find(l => /^(?:k8s:)?(?:app|app\.kubernetes\.io\/name|k8s-app)$/.test(l.key))?.value;
      node.data.label = app || node.id;
    }
  });
  return { nodes: Array.from(groups.values(), group => group.node).sort((a, b) => a.id.localeCompare(b.id)), edges: Array.from(links.values()).sort((a, b) => a.id.localeCompare(b.id)) };
}
