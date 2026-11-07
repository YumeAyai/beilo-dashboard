import { dataplaneRequest } from './dataplane';
import type { ClusterReport, IPPool, IPPoolInput } from '../types/cluster';

export const clusterApi = {
  status: (signal?: AbortSignal) => dataplaneRequest<ClusterReport>('/api/v1/cluster/status', { signal }),
  pools: (signal?: AbortSignal) => dataplaneRequest<{ items: IPPool[] }>('/api/v1/cluster/ip-pools', { signal }),
  savePool: (input: IPPoolInput, create: boolean) => dataplaneRequest<IPPool>('/api/v1/cluster/ip-pools', { method: create ? 'POST' : 'PUT', body: JSON.stringify(input) }),
  deletePool: (pool: Pick<IPPool, 'name' | 'resource_version'>) => dataplaneRequest<void>('/api/v1/cluster/ip-pools', { method: 'DELETE', body: JSON.stringify({ name: pool.name, resource_version: pool.resource_version }) }),
};
