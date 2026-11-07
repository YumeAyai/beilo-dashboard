import { getAuthHeaders } from '../contexts/getAuthHeaders';
import type { DataplaneReport, RuntimeEventsResponse, RuntimePoliciesResponse, RuntimePolicyInput, RuntimeMonitorSnapshot, RuntimeNetworkSnapshot } from '../types/dataplane';

function responseError(text: string, status: number): string {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string') return value.error;
  } catch { /* The runtime endpoints also return plain-text errors. */ }
  return text.trim().slice(0, 500) || `HTTP ${status}`;
}

/** Uses the existing session and supports both JSON and plain-text API errors. */
export async function dataplaneRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const origin = import.meta.env.PROD ? import.meta.env.VITE_API_URL || window.location.origin : window.location.origin;
  try {
    const headers = new Headers(getAuthHeaders());
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(new URL(path, origin), { ...init, headers });
    if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:expired'));
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!response.ok) throw new Error(responseError(text, response.status));
    return JSON.parse(text) as T;
  } catch (error) {
    if (!init.signal?.aborted) console.error('Dataplane API request failed', init.method || 'GET', path, error);
    throw error;
  }
}

function policyPath(namespace: string, name: string): string {
  return `/api/v1/runtime/policies?${new URLSearchParams({ namespace, name })}`;
}

export const dataplaneApi = {
  network: (namespace = '', protocol = '', signal?: AbortSignal) => dataplaneRequest<RuntimeNetworkSnapshot>(`/api/v1/runtime/network?${new URLSearchParams({ namespace, protocol, limit: '100' })}`, { signal }),
  monitor: (signal?: AbortSignal) => dataplaneRequest<RuntimeMonitorSnapshot>('/api/v1/runtime/monitor', { signal }),
  status: (signal?: AbortSignal) => dataplaneRequest<DataplaneReport>('/api/v1/dataplane/status', { signal }),
  policies: (namespace: string, signal?: AbortSignal) => dataplaneRequest<RuntimePoliciesResponse>(
    `/api/v1/runtime/policies/list?${new URLSearchParams({ namespace })}`, { signal }),
  events: (duration: string, signal?: AbortSignal) => dataplaneRequest<RuntimeEventsResponse>(
    `/api/v1/runtime/events?${new URLSearchParams({ duration, limit: '200' })}`, { signal }),
  savePolicy: (namespace: string, name: string, policy: RuntimePolicyInput) => dataplaneRequest<unknown>(
    policyPath(namespace, name), { method: 'PUT', body: JSON.stringify(policy) }),
  deletePolicy: (namespace: string, name: string) => dataplaneRequest<void>(policyPath(namespace, name), { method: 'DELETE' }),
};
