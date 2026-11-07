import { streamFlowEvents } from './flowStream';
import type { ObservationMetadata } from "../types/observability";
import type { SystemStatus, LogEntry, BlockedIP, ApiResponse, ThreatEvent, ThreatStatistics, QPSData, IPSourceStats, ClusterHealth, SourceAddressType } from '../types/threat';
import type { HubbleFlow } from '../types/hubble';
import { OWASP_RULESETS, RULE_TEMPLATES } from './rulesData';
import type {
  Rule, RuleGroup, RuleTemplate, RuleQueryParams,
  RuleCreateInput, RuleUpdateInput, RuleTestInput, RuleTestResult,
  RuleListResponse, RuleImportResult, OWASPRuleSet,
} from './rulesData';
import { getAuthHeaders } from '../contexts/getAuthHeaders';
import { useAuth } from '../contexts/useAuth';
export { useAuth, getAuthHeaders, OWASP_RULESETS, RULE_TEMPLATES };
export type { User } from '../contexts/AuthContext';
export type {
  Rule, RuleGroup, RuleTemplate, RuleQueryParams,
  RuleCreateInput, RuleUpdateInput, RuleTestInput, RuleTestResult,
  RuleListResponse, RuleImportResult, OWASPRuleSet,
};

const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  : '';

async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  return response;
}

export async function fetchApi<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, BASE_URL || window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }
  const response = await fetch(url.toString(), { headers: getAuthHeaders(), signal });
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

export async function postApi<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

export async function putApi<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

export async function deleteApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

// System status API
export const systemApi = {
  async getStatus(): Promise<SystemStatus> {
    return fetchApi<SystemStatus>('/api/v1/status');
  },

  async getHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        await response.text();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};

// Logs API
export const observabilityApi = {
  async getLogs(query: string = '{job="beilo-waf"}', duration: string = '1h', limit: number = 100): Promise<LogEntry[]> {
    const response = await authFetch(`${BASE_URL}/api/v1/logs`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, duration, limit }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to query logs' }));
      throw new Error(error.error || `API error: ${response.status}`);
    }
    return response.json();
  },
};

// Block API
export const blockApi = {
  async getBlockedIPs(): Promise<BlockedIPResponse[]> {
    return fetchApi<BlockedIPResponse[]>('/api/v1/block/ip');
  },

  async blockIP(ip: string, reason?: string): Promise<ApiResponse> {
    return postApi<ApiResponse>('/api/v1/block/ip', { ip, reason, duration: '1h' });
  },

  async unblockIP(ip: string): Promise<ApiResponse> {
    return deleteApi<ApiResponse>('/api/v1/block/ip', { ip });
  },
};

interface BlockedIPResponse {
  Entity: string;
  BlockType: string;
  Reason: string;
  BlockedAt: string;
  ExpiresAt: string;
  Source: string;
  Count: number;
}

// WAF Policy API
export const wafApi = {
  async applyPolicy(service: string, namespace: string, rules: string[]): Promise<ApiResponse> {
    return postApi<ApiResponse>('/api/v1/waf/policy', { service_name: service, namespace, rules });
  },

  async removePolicy(): Promise<ApiResponse> {
    return deleteApi<ApiResponse>('/api/v1/waf/policy');
  },

  async deployWASM(): Promise<ApiResponse> {
    return postApi<ApiResponse>('/api/v1/waf/deploy');
  },
};

// Prometheus API
export const prometheusApi = {
  async getServices(): Promise<unknown[]> {
    return Promise.resolve([]);
  },
  async getFlows(): Promise<unknown[]> {
    return Promise.resolve([]);
  },
  async getTopology(): Promise<{ nodes: unknown[]; edges: unknown[]; source?: string }> {
    return fetchApi<{ nodes: unknown[]; edges: unknown[]; source?: string }>('/api/v1/topology');
  },
  async getServiceMetrics(): Promise<unknown> {
    return Promise.resolve({});
  },
  async queryPrometheus(): Promise<unknown> {
    return Promise.resolve({});
  },
};

// Threat API
export const threatApi = {
  async reportThreat(event: {
    source_ip: string;
    destination_ip: string;
    threat_type: string;
    severity: string;
    details?: string;
  }): Promise<ApiResponse> {
    return postApi<ApiResponse>('/api/v1/threat/report', event);
  },

  async getStatistics(): Promise<ThreatStatistics> {
    const stats = await fetchApi<{ total_requests: number; total_threats: number; blocked_requests: number; threat_rate: number; category_stats: Record<string, number>; severity_stats: Record<string, number>; top_source_ips: Array<{ ip: string; threat_count?: number; country?: string; city?: string; countryCode?: string; requestCount?: number; threatCount?: number; percentage?: string }> }>('/api/v1/threat/statistics');
    return {
      totalRequests: stats.total_requests || 0,
      totalThreats: stats.total_threats || 0,
      blockedRequests: stats.blocked_requests || 0,
      threatRate: stats.threat_rate || 0,
      categoryStats: stats.category_stats || {},
      severityStats: stats.severity_stats || {},
      topSourceIPs: (stats.top_source_ips || []).map(ip => ({
        ip: ip.ip || '',
        threatCount: ip.threat_count || ip.threatCount || 0,
        requestCount: ip.requestCount || 0,
        blockedCount: 0,
        lastActivity: '',
        country: ip.country,
        isp: '',
      })),
      topTargetURLs: [],
      recentEvents: [],
      timeSeriesData: [],
    };
  },

  async getEvents(limit: number = 100): Promise<ThreatEvent[]> {
    const events = await fetchApi<Array<{ id: string; timestamp: string; source_ip: string; url: string; method: string; threat_type: string; threat_category: string; severity: string; status_code: number; user_agent?: string; action?: string }>>('/api/v1/threat/events', { limit: String(limit) });
    return events.map(e => ({
      id: e.id || '',
      timestamp: e.timestamp || '',
      sourceIP: e.source_ip || '',
      url: e.url || '',
      method: e.method || '',
      threatType: e.threat_type || '',
      threatCategory: e.threat_category || '',
      severity: e.severity || '',
      statusCode: e.status_code || 0,
      userAgent: e.user_agent || '',
      action: e.action || '',
    }));
  },

  async getBlockedIPs(): Promise<BlockedIP[]> {
    const ips = await blockApi.getBlockedIPs();
    return ips.map(ip => ({
      ip: ip.Entity || '',
      reason: ip.Reason || '',
      blockedAt: ip.BlockedAt || '',
      expiresAt: ip.ExpiresAt || '',
      blockedCount: ip.Count || 0,
    }));
  },

  async blockIP(ip: string, reason?: string): Promise<ApiResponse> {
    return blockApi.blockIP(ip, reason);
  },

  async unblockIP(ip: string): Promise<ApiResponse> {
    return blockApi.unblockIP(ip);
  },
};

// Topology API
export const topologyApi = {
  async getStatus(): Promise<{ flowsPerSec: number; nodesConnected: number; totalNodes: number }> {
    return fetchApi('/api/v1/topology/status');
  },
  async getTopology(namespace?: string): Promise<{ nodes: TopologyNode[]; edges: TopologyEdge[] }> {
    return fetchApi<{ nodes: TopologyNode[]; edges: TopologyEdge[] }>('/api/v1/topology', namespace ? { namespace } : undefined);
  },
  async getNamespaces(): Promise<string[]> {
    const data = await fetchApi<{ namespaces: string[] }>('/api/v1/namespace/resources', { namespace: '' });
    return data.namespaces || [];
  },
  async getNamespaceResources(namespace: string): Promise<{
    pods: Array<{ name: string; status: string; ready: string; restarts: number; age: string; ip: string; node: string }>;
    services: Array<{ name: string; type: string; clusterIP: string; ports: number[] }>;
    deployments: Array<{ name: string; replicas: number; ready: string; age: string }>;
    ingresses: Array<{ name: string; class: string; hosts: string[]; age: string }>;
  }> {
    return fetchApi('/api/v1/namespace/resources', { namespace });
  },
  async getFlows(namespace: string, limit?: number): Promise<HubbleFlow[]> {
    const data = await fetchApi<{ namespace: string; limit: string; flows: HubbleFlow[] }>('/api/v1/flows', { namespace, limit: String(limit || 50) });
    return data.flows || [];
  },
  streamFlows(namespace: string, limit: number = 100, onFlow: (flow: HubbleFlow) => void,
    onState?: (state: 'receiving' | 'reconnecting' | 'stopped') => void): { close(): void } {
    return streamFlowEvents(`${BASE_URL}/api/v1/flows/stream?namespace=${encodeURIComponent(namespace)}&limit=${limit}`, getAuthHeaders, onFlow, onState);
  },
};

// Notification API
export const notificationApi = {
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    return fetchApi<RawNotificationItem[]>('/api/v1/notifications/inapp', { userId })
      .then((items) => items.map(transformNotification));
  },

  async markAsRead(id: string, userId: string): Promise<void> {
    await postApi(`/api/v1/notifications/inapp/${id}/read?userId=${encodeURIComponent(userId)}`);
  },

  async markAllAsRead(userId: string): Promise<void> {
    await postApi(`/api/v1/notifications/inapp/read-all?userId=${encodeURIComponent(userId)}`);
  },

  async deleteNotification(id: string, userId: string): Promise<void> {
    await deleteApi(`/api/v1/notifications/inapp/${id}?userId=${encodeURIComponent(userId)}`);
  },
};

// Raw notification from backend (snake_case)
interface RawNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

function transformNotification(raw: RawNotificationItem): NotificationItem {
  return {
    id: raw.id,
    type: raw.type as NotificationItem['type'],
    title: raw.title,
    message: raw.message,
    read: raw.read,
    timestamp: raw.created_at,
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'threat' | 'system' | 'info';
  timestamp: string;
  read: boolean;
}

interface TopologyNode {
  id: string;
  label: string;
  namespace: string;
  type: string;
  pods: number;
  ip?: string;
  traffic?: number;
  labels?: string[];
  ports?: number[];
  accessPoints?: Array<{ port: number; protocol: string; l7proto?: string }>;
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  traffic?: number;
  verdict?: string;
}

// ============== Rules API ==============

// Rules API
export const rulesApi = {
  async getRules(params?: RuleQueryParams): Promise<RuleListResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.category) queryParams.category = params.category;
    if (params?.severity) queryParams.severity = params.severity;
    if (params?.status) queryParams.status = params.status;
    if (params?.search) queryParams.search = params.search;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.namespace) queryParams.namespace = params.namespace;
    if (params?.ingress) queryParams.ingress = params.ingress;
    if (params?.gateway) queryParams.gateway = params.gateway;
    return fetchApi('/api/v1/waf/rules', queryParams);
  },
  async getRule(id: string): Promise<Rule> { return fetchApi(`/api/v1/waf/rules/${id}`); },
  async createRule(rule: RuleCreateInput): Promise<Rule> { return postApi('/api/v1/waf/rules', rule); },
  async updateRule(id: string, rule: Partial<RuleCreateInput>): Promise<Rule> { return putApi(`/api/v1/waf/rules/${id}`, rule); },
  async deleteRule(id: string): Promise<void> { return deleteApi(`/api/v1/waf/rules/${id}`); },
  async enableRules(ids: string[]): Promise<void> { return postApi('/api/v1/waf/rules', { ids, action: 'enable' }); },
  async disableRules(ids: string[]): Promise<void> { return postApi('/api/v1/waf/rules', { ids, action: 'disable' }); },
  async deleteRules(ids: string[]): Promise<void> { return postApi('/api/v1/waf/rules', { ids, action: 'delete' }); },
  async getRuleGroups(): Promise<RuleGroup[]> { return fetchApi('/api/v1/waf/rule-groups'); },
  async createRuleGroup(group: Partial<RuleGroup>): Promise<RuleGroup> { return postApi('/api/v1/waf/rule-groups', group); },
  async updateRuleGroup(id: string, group: Partial<RuleGroup>): Promise<RuleGroup> { return putApi(`/api/v1/waf/rule-groups/${id}`, group); },
  async deleteRuleGroup(id: string): Promise<void> { return deleteApi(`/api/v1/waf/rule-groups/${id}`); },
  async getTemplates(): Promise<RuleTemplate[]> { return fetchApi('/api/v1/waf/rule-templates'); },
  async getTemplate(id: string): Promise<RuleTemplate> { return fetchApi(`/api/v1/waf/rule-templates/${id}`); },
  async applyTemplate(templateId: string, target?: { service?: string; namespace?: string }): Promise<Rule[]> { return postApi(`/api/v1/waf/rule-templates/${templateId}/apply`, target); },
  async testRule(input: RuleTestInput): Promise<RuleTestResult> { return postApi('/api/v1/waf/rules/test', input); },
  async importRules(file: File, format: 'yaml' | 'json'): Promise<RuleImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    const headers = new Headers(getAuthHeaders());
    headers.delete('Content-Type');
    const response = await authFetch(`${BASE_URL}/api/v1/waf/rules/import`, { method: 'POST', headers, body: formData });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  async exportRules(ids?: string[], format: 'owasp' | 'json' = 'json'): Promise<Blob> {
    const url = new URL('/api/v1/waf/rules/export', BASE_URL || window.location.origin);
    url.searchParams.append('format', format);
    if (ids?.length) url.searchParams.set('ids', ids.join(','));
    const response = await authFetch(url.toString(), { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(await response.text());
    return response.blob();
  },
  async getOWASPRuleSets(): Promise<OWASPRuleSet[]> { return fetchApi('/api/v1/waf/owasp-rulesets'); },
  async applyOWASPRuleSet(ruleSetId: string): Promise<void> { return postApi(`/api/v1/waf/owasp-rulesets/${ruleSetId}/apply`); },
  // Ingress 列表（供规则编辑器选择绑定目标）
  async listIngresses(): Promise<IngressInfo[]> { return fetchApi('/api/v1/waf/ingresses'); },
  async listGateways(namespace?: string): Promise<GatewayInfo[]> { return fetchApi('/api/v1/waf/gateways', namespace ? { namespace } : undefined); },
};

// ============== RBAC API ==============

export interface RBACUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  isSuperAdmin: boolean;
  totpEnabled?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RBACRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RBACPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface UserSettings {
  userId: string;
  siteName: string;
  siteUrl: string;
  contactEmail: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderAlerts: boolean; // Legacy API key for the alert subscription preference.
  systemUpdates: boolean;
  weeklyReport: boolean;
  loginNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export const rbacApi = {
  // Auth
  async login(username: string, password: string, totpCode?: string): Promise<{ token: string; user: RBACUser; totpRequired?: boolean }> {
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, totpCode }),
    });
    const data = await response.json().catch(() => ({ error: 'Login failed' }));
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    if (data.totpRequired) {
      return { token: '', user: data.user, totpRequired: true };
    }
    localStorage.setItem('beilo_auth_token', data.token);
    return { token: data.token, user: data.user, totpRequired: false };
  },

  async refreshToken(): Promise<{ token: string }> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (response.status === 401) throw new Error('Unauthorized');
    if (!response.ok) throw new Error('Session expired');
    const data = await response.json();
    localStorage.setItem('beilo_auth_token', data.token);
    return { token: data.token };
  },

  // TOTP 2FA
  async setupTOTP(): Promise<{ secret: string; qrCodeURL: string }> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/auth/totp/setup`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to setup TOTP' }));
      throw new Error(data.error || 'Failed to setup TOTP');
    }
    return response.json();
  },

  async enableTOTP(code: string, secret: string): Promise<{ success: boolean }> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/auth/totp/enable`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, secret }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to enable TOTP' }));
      throw new Error(data.error || 'Failed to enable TOTP');
    }
    return response.json();
  },

  async disableTOTP(code: string): Promise<{ success: boolean }> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/auth/totp/disable`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to disable TOTP' }));
      throw new Error(data.error || 'Failed to disable TOTP');
    }
    return response.json();
  },

  async verifyTOTP(code: string): Promise<{ valid: boolean }> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/auth/totp/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to verify TOTP' }));
      throw new Error(data.error || 'Failed to verify TOTP');
    }
    return response.json();
  },

  // Users
  async getUsers(): Promise<RBACUser[]> { return fetchApi('/api/v1/users'); },
  async getUser(id: string): Promise<RBACUser> { return fetchApi(`/api/v1/users/${id}`); },
  async createUser(user: { username: string; email: string; password: string; fullName: string; roles: string[]; isActive: boolean }): Promise<RBACUser> {
    return postApi('/api/v1/users', user);
  },
  async updateUser(id: string, user: Partial<{ email: string; fullName: string; password: string; roles: string[]; isActive: boolean }>): Promise<RBACUser> {
    return putApi(`/api/v1/users/${id}`, user);
  },
  async deleteUser(id: string): Promise<void> { return deleteApi(`/api/v1/users/${id}`); },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/users/change-password`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to change password' }));
      throw new Error(data.error || 'Failed to change password');
    }
  },

  // User settings
  async getUserSettings(): Promise<UserSettings> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/users/settings`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to get user settings');
    return response.json();
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const token = localStorage.getItem('beilo_auth_token');
    const response = await authFetch(`${BASE_URL}/api/v1/users/settings`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to update user settings');
    return response.json();
  },

  // Roles
  async getRoles(): Promise<RBACRole[]> { return fetchApi('/api/v1/roles'); },
  async getRole(id: string): Promise<RBACRole> { return fetchApi(`/api/v1/roles/${id}`); },
  async createRole(role: { name: string; description: string; permissions: string[] }): Promise<RBACRole> {
    return postApi('/api/v1/roles', role);
  },
  async updateRole(id: string, role: Partial<{ description: string; permissions: string[] }>): Promise<RBACRole> {
    return putApi(`/api/v1/roles/${id}`, role);
  },
  async deleteRole(id: string): Promise<void> { return deleteApi(`/api/v1/roles/${id}`); },

  // Permissions
  async getPermissions(): Promise<RBACPermission[]> { return fetchApi('/api/v1/permissions'); },
};

// ============== WAF Policies API ==============

export interface WAFPolicy {
  id: string;
  name: string;
  userId: string;
  description: string;
  rules: { ruleId: string; enabled: boolean; priority: number }[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const wafPolicyApi = {
  async getPolicies(): Promise<WAFPolicy[]> { return fetchApi('/api/v1/waf/policies'); },
  async getPolicy(id: string): Promise<WAFPolicy> { return fetchApi(`/api/v1/waf/policies/${id}`); },
  async createPolicy(policy: { name: string; description: string; rules: { ruleId: string; enabled: boolean; priority: number }[]; isDefault: boolean }): Promise<WAFPolicy> {
    return postApi('/api/v1/waf/policies', policy);
  },
  async updatePolicy(id: string, policy: Partial<{ name: string; description: string; rules: { ruleId: string; enabled: boolean; priority: number }[]; isDefault: boolean }>): Promise<WAFPolicy> {
    return putApi(`/api/v1/waf/policies/${id}`, policy);
  },
  async deletePolicy(id: string): Promise<void> { return deleteApi(`/api/v1/waf/policies/${id}`); },
};

export interface IngressInfo {
  name: string;
  namespace: string;
  hosts: string[];
  wafEnabled: boolean;
}
export interface GatewayInfo extends IngressInfo {
  className: string;
  managed: boolean;
  bindable: boolean;
  reason?: string;
  policyScope: 'Gateway';
  listeners: Array<{ name: string; protocol: string; port: number; hostname?: string }>;
  addresses: Array<{ type?: string; value: string }> | null;
  conditions: Array<{ type: string; status: string; reason: string; message: string; observedGeneration?: number }> | null;
}
// ============== Notification API ==============

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'dingtalk' | 'wecom' | 'weixin' | 'feishu' | 'lark' | 'telegram' | 'discord' | 'teams';
  config: Record<string, unknown>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  conditions: { type: string; operator: string; value: unknown }[];
  actions: { type: string; config: Record<string, unknown> }[];
  channelIDs: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  ruleID: string;
  channelID: string;
  channelType: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  payload: Record<string, unknown>;
  sentAt: string;
  createdAt: string;
}

export interface NotificationJob {
 id: string; eventID: string; channelID: string; channelType: string; recipient?: string;
 title: string; message: string; status: 'pending' | 'sending' | 'sent' | 'failed' | 'retry_wait' | 'unknown' | 'cancelled';
 attempts: number; error?: string; createdAt: string; updatedAt: string; nextAttemptAt: string;
}
export interface NotificationDispatch { eventID: string; jobIDs: string[] }
export interface WeixinBindingState { status: string; loginID?: string; qrContent?: string; channel?: NotificationChannel }

export const notificationApi2 = {
  async startWeixinLogin(id: string): Promise<WeixinBindingState> { return postApi(`/api/v1/notifications/channels/${encodeURIComponent(id)}/weixin/login`, {}); },
  async pollWeixinLogin(id: string, loginID: string, verifyCode?: string): Promise<WeixinBindingState> { return postApi(`/api/v1/notifications/channels/${encodeURIComponent(id)}/weixin/poll`, { loginID, verifyCode }); },
  async syncWeixinConversation(id: string): Promise<WeixinBindingState> { return postApi(`/api/v1/notifications/channels/${encodeURIComponent(id)}/weixin/sync`, {}); },
  /** Persist a test delivery and return task IDs; does not imply provider acceptance. */
  async testChannel(id: string): Promise<NotificationDispatch> { return postApi(`/api/v1/notifications/channels/${encodeURIComponent(id)}/test`, {}); },
  async getJobs(after?: string): Promise<{ items: NotificationJob[]; nextCursor: string }> { return fetchApi('/api/v1/notifications/jobs', after ? { after } : undefined); },
  async retryJob(id: string, confirmUnknown = false): Promise<NotificationDispatch> {
    const response = await fetch(`${BASE_URL}/api/v1/notifications/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST', headers: { ...getAuthHeaders(), 'X-Confirm-Duplicate-Risk': String(confirmUnknown) } });
    if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || `API error: ${response.status}`); }
    return response.json();
  },
  // Channels
  async getChannels(): Promise<NotificationChannel[]> { return fetchApi('/api/v1/notifications/channels'); },
  async getChannel(id: string): Promise<NotificationChannel> { return fetchApi(`/api/v1/notifications/channels/${id}`); },
  async createChannel(channel: { name: string; type: string; config: Record<string, unknown>; isDefault: boolean; isActive: boolean }): Promise<NotificationChannel> {
    return postApi('/api/v1/notifications/channels', channel);
  },
  async updateChannel(id: string, channel: Partial<{ name: string; config: Record<string, unknown>; isDefault: boolean; isActive: boolean }>): Promise<NotificationChannel> {
    return putApi(`/api/v1/notifications/channels/${id}`, channel);
  },
  async deleteChannel(id: string): Promise<void> { return deleteApi(`/api/v1/notifications/channels/${id}`); },

  // Rules
  async getRules(): Promise<NotificationRule[]> { return fetchApi('/api/v1/notifications/rules'); },
  async getRule(id: string): Promise<NotificationRule> { return fetchApi(`/api/v1/notifications/rules/${id}`); },
  async createRule(rule: { name: string; description: string; conditions: { type: string; operator: string; value: unknown }[]; actions: { type: string; config: Record<string, unknown> }[]; channelIDs: string[]; isActive: boolean }): Promise<NotificationRule> {
    return postApi('/api/v1/notifications/rules', rule);
  },
  async updateRule(id: string, rule: Partial<{ name: string; description: string; conditions: { type: string; operator: string; value: unknown }[]; actions: { type: string; config: Record<string, unknown> }[]; channelIDs: string[]; isActive: boolean }>): Promise<NotificationRule> {
    return putApi(`/api/v1/notifications/rules/${id}`, rule);
  },
  async deleteRule(id: string): Promise<void> { return deleteApi(`/api/v1/notifications/rules/${id}`); },

  // History
  async getHistory(limit?: number): Promise<NotificationRecord[]> {
    const params = limit ? { limit: String(limit) } : undefined;
    return fetchApi('/api/v1/notifications/history', params);
  },

  // Send
  async sendNotification(channelID: string, title: string, message: string, payload?: Record<string, unknown>): Promise<void> {
    return postApi('/api/v1/notifications/send', { channelID, title, message, payload });
  },
};

export type { SystemStatus, LogEntry, BlockedIP, ApiResponse, ThreatEvent, ThreatStatistics, QPSData, IPSourceStats, ClusterHealth, SourceAddressType };

// Dashboard API - real data from backend
export interface QPSResponse {
 observability?: ObservationMetadata;
  currentQPS: number;
  peakQPS: number;
  barData: Array<{ time: number | string; qps: number }>;
}

export interface ClusterMetricsResponse {
  protectionCounters?: import('../types/observability').ProtectionCounters;
 observability?: ObservationMetadata;
  totalRequests: number;
  threatRequests: number;
  blockedRequests: number;
  requestTrend: Array<{ time: string; requests: number; threats: number; blocked: number }>;
  threatTrend: Array<{ time: string; requests: number; threats: number; blocked: number }>;
  clientSource: {
    browser: Array<{ name: string; value: number }>;
    os: Array<{ name: string; value: number }>;
  };
  externalSources: {
    domains: Array<{ name: string; count: number }>;
    pages: Array<{ name: string; count: number }>;
  };
  visited: {
    domains: Array<{ name: string; count: number }>;
    pages: Array<{ name: string; count: number }>;
  };
  ipSources: Array<{
    ip: string;
    addressType?: SourceAddressType;
    country: string;
    city: string;
    countryCode: string;
    requestCount: number;
    threatCount: number;
    blockedCount: number;
    percentage: number;
    status: string;
    lat?: number;
    lng?: number;
    wafId?: string;       // 所属 WAF 节点
  }>;
  responseStatus: {
    waf: Array<{ name: string; value: number }>;
    origin: Array<{ name: string; value: number }>;
  };
  wafLocations?: Array<{    // 多节点
    id: string;
    city: string;
    country: string;
    countryCode: string;
    lat: number;
    lng: number;
    requests: number;
    threats: number;
    blocked: number;
    status: string;
    ip?: string;
  }>;
  wafLocation?: {           // 旧版单节点兼容
    status: string;
    country: string;
    countryCode: string;
    city: string;
    lat: number;
    lng: number;
    query: string;
  };
}

export interface ClusterHealthResponse {
  /** Distinct configured entry resources, WAF-associated HTTP backend Services and live Pods. */
  protectionOverview?: {
    entryCount: number | null;
    ingressCount: number | null;
    gatewayCount: number | null;
    externalServiceCount: number | null;
    businessServiceCount: number | null;
    podCount: number | null;
    readyPodCount: number | null;
    entrySource: 'available' | 'unavailable';
    serviceSource: 'available' | 'unavailable';
    podSource: 'available' | 'unavailable';
  };
  /** Published ingress resources; does not confirm external reachability. */
  entryExposure?: {
    ingressCount: number | null;
    gatewayCount: number | null;
    ingressSource: 'available' | 'unavailable';
    gatewaySource: 'available' | 'unavailable' | 'not_installed';
  };
  overallStatus: string;
  components: Array<{
    name: string;
    /** /healthz 直连检测: healthy | degraded */
    status: string;
    /** Pod 级别最差状态聚合: healthy | degraded | down */
    overallStatus?: string;
    latency?: number;
    uptime?: string;
    version?: string;
    podStatus?: {
      ready: number;
      total: number;
      notReadyPods?: Array<{
        name: string;
        namespace: string;
        reason: string;
        message?: string;
      }>;
    };
  }>;
  ingressCount: number;
  serviceCount: number;
}

export const dashboardApi = {
  // High-frequency QPS query (5 second polling)
  async getQPS(): Promise<QPSResponse> {
    return fetchApi<QPSResponse>('/api/v1/cluster/qps');
  },

  // Low-frequency metrics query (30+ second polling) — uses Prometheus query_range
  async getMetrics(duration: string = '24h'): Promise<ClusterMetricsResponse> {
    return fetchApi<ClusterMetricsResponse>('/api/v1/cluster/metrics', { duration });
  },

  // Cluster health (30 second polling)
  async getClusterHealth(): Promise<ClusterHealthResponse> {
    return fetchApi<ClusterHealthResponse>('/api/v1/cluster/health');
  },

  // Deprecated: getMapSummary() merged into getMetrics(), getClusterResources() merged into getClusterHealth()
};

// ============== Aggregation API ==============
import type {
  AggregationUnifiedDashboard,
  AggregationClusterSummary,
  AggregationAttackEventsResponse,
  AggregationMetricsResponse,
} from '../types/threat';

export const aggregationApi = {
  // Unified dashboard with all aggregated data, optional duration filter
  async getDashboard(duration?: string): Promise<AggregationUnifiedDashboard> {
    const params: Record<string, string> = {};
    if (duration) params.duration = duration;
    return fetchApi<AggregationUnifiedDashboard>('/api/v1/aggregation/dashboard', params);
  },

  // Cluster summary (K8s nodes, pods, services)
  async getClusterSummary(): Promise<AggregationClusterSummary> {
    return fetchApi<AggregationClusterSummary>('/api/v1/aggregation/cluster');
  },

  // Attack events with optional limit and duration filter
  async getAttackEvents(limit: number = 50, duration?: string): Promise<AggregationAttackEventsResponse> {
    const params: Record<string, string> = { limit: String(limit) };
    if (duration) params.duration = duration;
    return fetchApi<AggregationAttackEventsResponse>('/api/v1/aggregation/attacks', params);
  },

  // Unified metrics with threat summary, trend, events, and top attackers
  async getMetrics(limit: number = 100, duration: string = '1h'): Promise<AggregationMetricsResponse> {
    return fetchApi<AggregationMetricsResponse>('/api/v1/aggregation/metrics', { limit: String(limit), duration });
  },
};

// Dashboard mock data generators - DEPRECATED
// Business APIs report source availability; unavailable metrics are not mock data.
// This file is kept for reference only and will be removed in future versions.
