import { fetchApi } from './api';

export interface AuditActor { id: string; name?: string; type: string; groups?: string[] }
export interface PolicyChange {
  domain: string; resource: string; namespace?: string; name: string; operation: string;
  before: unknown; after: unknown; fields: string[]; beforeSource: string;
}
export interface PolicyAuditEvent {
  id: string; time: string; operationId: string; actor: AuditActor; source: string;
  phase: string; result: string; method?: string; path?: string; sourceIp?: string;
  statusCode?: number; sourceId?: string; digest: string; changes: PolicyChange[];
  native?: { level: string; userAgent: string; request: unknown; impersonatedUser?: AuditActor };
}
export interface PolicyAuditPage { events: PolicyAuditEvent[]; nextCursor: string; scanned: number }
export interface PolicyAuditStatus {
  externalAuditHealthy: boolean; storageMode?: string;
  sources: { node: string; readAt: string; lastEventAt?: string; coverageStart?: string; error?: string }[];
}
export const policyAuditApi = {
  list: (params: Record<string, string>, signal?: AbortSignal) => fetchApi<PolicyAuditPage>('/api/v1/audit/events', params, signal),
  detail: (id: string, signal?: AbortSignal) => fetchApi<PolicyAuditEvent>(`/api/v1/audit/events/${encodeURIComponent(id)}`, undefined, signal),
  status: (signal?: AbortSignal) => fetchApi<PolicyAuditStatus>('/api/v1/audit/status', undefined, signal),
};
