// HubbleFlow type definition - matches the protobuf JSON output exactly
// This allows beilo's backend to serve data in Hubble UI format

export interface Time {
  seconds: number;
  nanos: number;
}

export interface Ethernet {
  source: string;
  destination: string;
}

export interface IPInfo {
  source: string;
  destination: string;
  ipVersion: 'NOT_USED' | 'V4' | 'V6';
  encrypted: boolean;
}

export interface TCPFlags {
  fin: boolean;
  syn: boolean;
  rst: boolean;
  psh: boolean;
  ack: boolean;
  urg: boolean;
  ece: boolean;
  cwr: boolean;
  ns: boolean;
}

export interface TCPInfo {
  sourcePort: number;
  destinationPort: number;
  flags?: TCPFlags;
}

export interface UDPInfo {
  sourcePort: number;
  destinationPort: number;
}

export interface ICMPInfo {
  type: number;
  code: number;
}

export interface SCTPInfo {
  sourcePort: number;
  destinationPort: number;
}

export interface Layer4 {
  tcp?: TCPInfo;
  udp?: UDPInfo;
  icmpv4?: ICMPInfo;
  icmpv6?: ICMPInfo;
  sctp?: SCTPInfo;
}

export interface HTTPHeader {
  key: string;
  value: string;
}

export interface HTTP {
  code: number;
  method: string;
  url: string;
  protocol: string;
  headersList?: HTTPHeader[];
}

export interface DNS {
  query: string;
  ips: string[];
  ttl: number;
  cnames: string[];
  observationSource: string;
  rcode: number;
  qtypes: string[];
  rrtypes: string[];
}

export interface Kafka {
  errorCode: number;
  apiVersion: number;
  apiKey: string;
  correlationId: number;
  topic: string;
}

export interface Layer7 {
  type: string;
  latencyNs: number;
  dns?: DNS;
  http?: HTTP;
  kafka?: Kafka;
}

export interface Workload {
  kind: string;
  name: string;
}

export interface Endpoint {
  id: number;
  identity: number;
  namespace: string;
  labels: string[];
  workloads: Workload[];
  podName: string;
}

export interface EventType {
  type: number;
  subType: number;
}

export interface Service {
  name: string;
  namespace: string;
}

// Main HubbleFlow interface - matches protobuf JSON serialization
export interface HubbleFlow {
  time?: Time;
  verdict: string;
  dropReason: number;
  ethernet?: Ethernet;
  ip?: IPInfo;
  l4?: Layer4;
  source?: Endpoint;
  destination?: Endpoint;
  type: string;
  nodeName: string;
  sourceNamesList: string[];
  destinationNamesList: string[];
  l7?: Layer7;
  reply: boolean;
  eventType?: EventType;
  sourceService?: Service;
  destinationService?: Service;
  summary: string;
  trafficDirection: string;
  authType: string;
}

// Backward compatibility alias
export type FlowData = HubbleFlow;
