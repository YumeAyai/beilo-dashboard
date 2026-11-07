// Service node types for topology visualization
export interface ServiceNode {
  id: string;
  label: string;
  namespace: string;
  type: 'ingress' | 'egress' | 'internal' | 'external';
  requestRate: number;
  errorRate: number;
  latencyP50: number;
  latencyP99: number;
  pods: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  traffic: number; // requests per second
  direction: 'ingress' | 'egress' | 'internal';
  latency: number;
  errorRate: number;
}

export interface TopologyData {
  nodes: ServiceNode[];
  edges: FlowEdge[];
}

export interface ServiceMetrics {
  requestRate: number;
  errorRate: number;
  latencyP50: number;
  latencyP99: number;
  throughput: number;
  activeConnections: number;
}

export interface NodeMetrics {
  cpu: number;
  memory: number;
  pods: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
  };
}

export interface FlowMetrics {
  sourceService: string;
  sourceNamespace: string;
  destService: string;
  destNamespace: string;
  requestsPerSecond: number;
  latencyMs: number;
  errorRate: number;
  direction: 'ingress' | 'egress' | 'internal';
}
