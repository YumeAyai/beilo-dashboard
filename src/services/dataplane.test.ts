// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dataplaneApi, dataplaneRequest } from './dataplane';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

describe('dataplane transport', () => {
  it('handles a successful empty deletion without trying to decode JSON', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(dataplaneApi.deletePolicy('app', 'files')).resolves.toBeUndefined();
    expect(String(fetcher.mock.calls[0][0])).toContain('namespace=app&name=files');
  });
  it('shows the plain-text RBAC message returned by the runtime backend', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Kubernetes RBAC denied policy operation\n', { status: 403 })));
    await expect(dataplaneApi.policies('restricted')).rejects.toThrow('Kubernetes RBAC denied policy operation');
  });
  it('uses the existing session and a JSON content type for policy writes', async () => {
    localStorage.setItem('beilo_auth_token', 'test-session');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await dataplaneApi.savePolicy('app', 'watch', { kind: 'exec', executables: ['/bin/sh'], pod_labels: { app: 'web' }, enforce: false });
    const options = fetcher.mock.calls[0][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-session');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(String(options.body))).toEqual({ kind: 'exec', executables: ['/bin/sh'], pod_labels: { app: 'web' }, enforce: false });
  });
  it('expires the shared session on 401', async () => {
    const expired = vi.fn();
    window.addEventListener('auth:expired', expired);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));
    await expect(dataplaneRequest('/api/v1/dataplane/status')).rejects.toThrow('Unauthorized');
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener('auth:expired', expired);
  });
});
