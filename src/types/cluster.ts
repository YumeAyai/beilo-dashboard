import type { DataplaneReport } from './dataplane';

export interface ClusterReport extends DataplaneReport {
  can_manage_pools: boolean;
  network: {
    namespace: string; config_state: string; config: Record<string, string>; workload_state: string;
    workloads: { name: string; namespace: string; kind: string; images: string[]; desired: number; ready: number; observed: boolean }[];
  };
  node_details: { name: string; os: string; architecture: string; kubelet: string; unschedulable: boolean; allocatable: Record<string, string>; conditions: Record<string, string> }[];
}
export interface PoolBlock { cidr?: string; start?: string; stop?: string }
export interface ServiceSelector { matchLabels?: Record<string, string>; matchExpressions?: { key: string; operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist'; values?: string[] }[] }
export interface IPPoolInput {
  name: string; resource_version: string; blocks: PoolBlock[]; disabled: boolean;
  service_selector: ServiceSelector | null; allow_first_last_ips: '' | 'Yes' | 'No';
}
export interface IPPool extends IPPoolInput {
  conflict: boolean; total: number | null; used: number | null; available: number | null; services: string[];
}
