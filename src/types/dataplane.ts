export type ObservationState = 'unknown' | 'not_installed' | 'available' | 'inactive' | 'degraded' | 'unconfigured' | 'unavailable' | 'empty';
export interface DataplaneAgent {
  name: string; namespace: string; desired: number; ready: number; observed: boolean;
}
export interface DataplaneComponent {
  id: 'cilium' | 'xdp' | 'tetragon'; state: ObservationState; desired: number; ready: number; agents: DataplaneAgent[];
}
export interface DataplaneNode {
  name: string; internal_ip: string; kernel: string; state: 'ready' | 'not_ready' | 'stale' | 'unknown'; last_heartbeat?: string;
}
export interface XDPTarget {
  job: string; instance: string; node?: string; passed: number | null; dropped_ip: number | null;
  dropped_tcp: number | null; sync_errors: number | null; attached: boolean | null; last_sync: string | null;
}
export interface LBPool {
  name: string; disabled: boolean; conflict: boolean; blocks: string[];
  total: number | null; available: number | null; used: number | null;
}
export interface VIPService {
  name: string; namespace: string; addresses: string[]; ports: string[]; state: 'pending' | 'allocated' | 'rejected'; reason?: string; message?: string;
}
export interface DataplaneReport {
  checked_at: string; components: DataplaneComponent[]; nodes: DataplaneNode[];
  xdp: { state: ObservationState; targets: XDPTarget[] };
  lb: { state: ObservationState; pools: LBPool[]; services: VIPService[] };
  issues: { source: string; message: string }[];
}
export interface RuntimePolicy {
  name: string; namespace: string; managed: boolean; kind: 'exec' | 'file' | 'custom';
  paths: string[]; pod_labels: Record<string, string>; enforce: boolean;
  execution_state: 'unknown'; resource_version: string; source_id?: string;
}
export interface RuntimePolicyInput {
  kind: 'exec' | 'file'; pod_labels: Record<string, string>; enforce: boolean;
  executables?: string[]; files?: string[];
}
export interface RuntimeEvent {
  time: string; node?: string; type: string; policy?: string; function?: string; action?: string;
  namespace?: string; pod?: string; container?: string; executable?: string; file?: string; pid?: number;
  tid?: number; exec_id?: string; parent_exec_id?: string; process_start_time?: string; container_id?: string;
  correlation?: {
    state: 'request' | 'session' | 'datagram' | 'connection' | 'ambiguous' | 'unavailable'; reason?: string; protocol?: 'http' | 'websocket' | 'udp' | 'tcp'; datagram_id?: string; connection_id?: string;
    request_id?: string; source_ip?: string; source_verified: boolean; method?: string; flow_ids?: string[];
    socket?: { inode?: string; cookie?: string; netns?: string; source_ip: string; destination_ip: string; source_port: number; destination_port: number; protocol: string };
  };
}
export interface RuntimeEventsResponse { events: RuntimeEvent[]; skipped: number; possibly_truncated: boolean }
export interface RuntimePoliciesResponse { items: RuntimePolicy[]; possibly_truncated: boolean }

export interface RuntimeFinding {
  id: string; rule: string; layer: string; profile: string; severity: string; description: string;
  first_seen: string; last_seen: string; samples: number; namespace: string; pod?: string;
  pod_uid?: string; container?: string; exec_id?: string; executable?: string; origin?: string;
  object?: string; reported_action?: string; evidence: string;
}
export interface RuntimeMonitorSnapshot {
  enabled: boolean; mode: string; checked_at: string;
  sources: { source: string; state: string; checked_at: string; samples: number; truncated: boolean; skipped: number; message?: string }[];
  profiles: { name: string; namespace: string; pod_labels: Record<string, string>; allowed_egress_cidrs?: string[] | null; allowed_egress_workloads?: { namespace: string; pod_labels: Record<string, string>; ports?: number[] }[] | null }[];
  findings: RuntimeFinding[]; limitations: string[];
}

export interface NetworkObservation {
 id: string; time: string; node: string; protocol: string; source_ip?: string; destination_ip?: string; source_port?: number; destination_port?: number;
 source_namespace?: string; source_pod?: string; destination_namespace?: string; destination_pod?: string; verdict: string; socket_cookie?: string; cgroup_id?: string; icmp_type?: number; icmp_code?: number;
}
export interface RuntimeNetworkSnapshot {
 state: string; scope: string; checked_at: string; last_event_at: string; last_interrupted_at: string; stream_gaps: number; node_status: string; nodes_connected?: number; total_nodes?: number;
 samples: number; truncated: boolean; retention_seconds: number; capacity: number; evicted: number; lossless: boolean; payload_captured: boolean; protocols: Record<string, number>; events: NetworkObservation[]; limitations: string[];
 context_coverage?: { enabled: boolean; namespaces: { namespace: string; state: string; reason?: string; policies: string[]; sensor_state: string; checked_at: string }[]; model: string };
}
