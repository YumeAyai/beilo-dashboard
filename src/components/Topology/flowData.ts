import type { HubbleFlow } from '../../types/hubble';

// FlowData with flat accessors for backward compatibility
export interface FlowData {
  id: string;
  sourcePod: string;
  sourceIP: string;
  sourceIdentity: string;
  destinationPod: string;
  destinationIP: string;
  destinationIdentity: string;
  destinationPort: number;
  l7info: string;
  trafficDirection: string;
  verdict: string;
  authentication: string;
  tcpFlags: string;
  timestamp: string;
  sourceLabels?: string[];
  destinationLabels?: string[];
  sourceDns?: string;
  destinationDns?: string;
  latency?: number;
  sourceService?: string;
  destinationService?: string;
  sourceNamespace?: string;
  destinationNamespace?: string;
  eventType?: string;
}

const flowIds = new WeakMap<HubbleFlow, string>();
let flowSequence = 0;

// Keep row selection attached to the packet when filters or new packets move it.
export function hubbleFlowToFlowData(flow: HubbleFlow): FlowData {
  let id = flowIds.get(flow);
  if (!id) { id = `flow-${++flowSequence}`; flowIds.set(flow, id); }
  // Get source info
  const sourcePod = flow.source?.podName || '';
  const sourceIP = flow.ip?.source || '';
  const sourceIdentity = flow.source?.identity !== undefined ? String(flow.source.identity) : '';
  const sourceLabels = Array.isArray(flow.source?.labels) ? flow.source.labels : [];
  const sourceNamespace = flow.source?.namespace || '';

  // Get destination info
  const destPod = flow.destination?.podName || '';
  const destIP = flow.ip?.destination || '';
  const destIdentity = flow.destination?.identity !== undefined ? String(flow.destination.identity) : '';
  const destLabels = Array.isArray(flow.destination?.labels) ? flow.destination.labels : [];
  const destNamespace = flow.destination?.namespace || '';

  // Get port info
  let destinationPort = 0;
  if (flow.l4?.tcp) {
    destinationPort = flow.l4.tcp.destinationPort;
  } else if (flow.l4?.udp) {
    destinationPort = flow.l4.udp.destinationPort;
  } else if (flow.l4?.sctp) {
    destinationPort = flow.l4.sctp.destinationPort;
  }

  // Get L7 info
  let l7info = '';
  if (flow.l7?.http) {
    l7info = `${flow.l7.http.method} ${flow.l7.http.url}`;
  } else if (flow.l7?.dns) {
    l7info = `DNS: ${flow.l7.dns.query}`;
  } else if (flow.l7?.kafka) {
    l7info = `Kafka: ${flow.l7.kafka.topic}`;
  }

  // Get TCP flags
  let tcpFlags = '';
  if (flow.l4?.tcp?.flags) {
    const flags = flow.l4.tcp.flags;
    const flagParts: string[] = [];
    if (flags.syn) flagParts.push('SYN');
    if (flags.ack) flagParts.push('ACK');
    if (flags.fin) flagParts.push('FIN');
    if (flags.rst) flagParts.push('RST');
    if (flags.psh) flagParts.push('PSH');
    tcpFlags = flagParts.join(',');
  }

  // Get timestamp
  let timestamp = '';
  if (flow.time) {
    const date = new Date(flow.time.seconds * 1000 + flow.time.nanos / 1000000);
    timestamp = date.toISOString().replace('T', ' ').substring(0, 19);
  }

  // Get service names
  const sourceService = flow.sourceService?.name || flow.sourceNamesList?.[0] || flow.source?.labels?.find(l => /^(?:k8s:)?(?:app|app.kubernetes.io\/name|k8s-app)=/.test(l))?.split('=').slice(1).join('=') || sourcePod || sourceIdentity;
  const destService = flow.destinationService?.name || flow.destinationNamesList?.[0] || flow.destination?.labels?.find(l => /^(?:k8s:)?(?:app|app.kubernetes.io\/name|k8s-app)=/.test(l))?.split('=').slice(1).join('=') || destPod || destIdentity;

  // Get event type subtitle (e.g., "to-endpoint", "to-host")
  const eventTypeSubtype = flow.eventType?.subType;
  const EVENT_TYPE_MAP: Record<number, string> = {
    1: 'to-endpoint',
    2: 'to-host',
    3: 'to-overlay',
    4: 'to-network',
  };
  const eventType = eventTypeSubtype !== undefined ? EVENT_TYPE_MAP[eventTypeSubtype] || `type-${eventTypeSubtype}` : undefined;

  return {
    id,
    sourcePod: sourcePod || '-',
    sourceIP: sourceIP || '-',
    sourceIdentity: sourceIdentity || '-',
    destinationPod: destPod || '-',
    destinationIP: destIP || '-',
    destinationIdentity: destIdentity || '-',
    destinationPort,
    l7info: l7info || '-',
    // Hubble returns "Ingress"/"Egress" but frontend expects "ingress"/"egress"
    trafficDirection: (flow.trafficDirection || 'unknown').toLowerCase(),
    // Hubble returns "FORWARDED"/"DROPPED"/"DENIED" but frontend expects lowercase
    verdict: (flow.verdict || 'unknown').toLowerCase(),
    authentication: flow.authType || '-',
    tcpFlags: tcpFlags || '-',
    timestamp: timestamp || '-',
    sourceLabels,
    destinationLabels: destLabels,
    sourceDns: flow.sourceNamesList?.[0] || '-',
    destinationDns: flow.destinationNamesList?.[0] || '-',
    latency: flow.l7?.latencyNs ? flow.l7.latencyNs / 1000000 : undefined,
    sourceService: sourceService || '-',
    destinationService: destService || '-',
    sourceNamespace: sourceNamespace || '-',
    destinationNamespace: destNamespace || '-',
    eventType,
  };
}
