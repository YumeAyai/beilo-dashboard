export type NodeType =
  | 'host'
  | 'world'
  | 'ingress'
  | 'egress'
  | 'service'
  | 'internal'
  | 'external'
  | 'database';

export type Verdict = 'forwarded' | 'dropped' | 'denied' | 'audit';

export type TrafficDirection = 'ingress' | 'egress' | 'internal';

export interface Label {
  key: string;
  value: string;
}

export interface AccessPoint {
  port: number;
  protocol: 'TCP' | 'UDP';
  l7Protocol?: string;
}

export interface L7EndpointData {
  method: string;
  url: string;
}

export interface ServiceCardData {
  id: string;
  label: string;
  namespace: string;
  type: NodeType;
  ports?: number[];
  isExternal?: boolean;
  isWorld?: boolean;
  isHost?: boolean;
  domain?: string;
  requestRate?: number;
  errorRate?: number;
  latencyP50?: number;
  pods?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  identity?: number;
  memberNodeIds?: string[];
  labels?: Label[];
  trafficDirection?: TrafficDirection;
  accessPoints?: AccessPoint[];
  l7Endpoints?: L7EndpointData[];
}

export interface ServiceMapNode {
  id: string;
  data: ServiceCardData;
  position: { x: number; y: number };
}

export interface ServiceMapEdge {
  id: string;
  source: string;
  target: string;
  verdict?: Verdict;
  traffic?: number;
  protocol?: string;
  destinationPort?: number;
}

export interface ArrowData {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  traffic?: number;
  verdict?: Verdict;
  protocol?: string;
  trafficDirection?: TrafficDirection;
  highlighted?: boolean;
}

export const CARD_WIDTH = 560;
export const CARD_HEIGHT = 200;
export const HEADER_HEIGHT = 52;
export const ACCESS_POINT_HEIGHT = 44;
