// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('API requests in production builds', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('PROD', true);
    localStorage.setItem('beilo_auth_token', 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'test-user' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it.each([undefined, ''])('uses the same origin for user CRUD when API URL is %s', async (apiUrl) => {
    vi.stubEnv('VITE_API_URL', apiUrl);
    const { rbacApi } = await import('./api');
    const user = { username: 'test-user', email: 'test@example.com', password: 'test-password', fullName: '测试用户', roles: ['viewer'], isActive: true };

    await rbacApi.getUsers();
    await rbacApi.createUser(user);
    await rbacApi.updateUser('test-user', { fullName: '更新用户' });
    await rbacApi.deleteUser('test-user');

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.map(([url]) => new URL(String(url), window.location.origin).pathname)).toEqual([
      '/api/v1/users', '/api/v1/users', '/api/v1/users/test-user', '/api/v1/users/test-user',
    ]);
    expect(calls.map(([, options]) => options?.method || 'GET')).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
    expect(calls[1][1]?.body).toBe(JSON.stringify(user));
    for (const [url, options] of calls) {
      expect(new URL(String(url), window.location.origin).origin).toBe(window.location.origin);
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-token');
    }
  });

  it('loads the original unified Threat metrics with one request and no view parameter', async () => {
    const { aggregationApi } = await import('./api');
    await aggregationApi.getMetrics(100, '1h');
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0][0]), window.location.origin);
    expect(url.pathname).toBe('/api/v1/aggregation/metrics');
    expect(url.searchParams.get('duration')).toBe('1h');
    expect(url.searchParams.get('limit')).toBe('100');
    expect(url.searchParams.has('view')).toBe(false);
  });

  it('honors a configured API origin for reads and writes, including trailing slash', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    const { fetchApi, postApi, putApi, deleteApi } = await import('./api');
    await fetchApi('/api/v1/users');
    await postApi('/api/v1/users', {});
    await putApi('/api/v1/users/test-user', {});
    await deleteApi('/api/v1/users/test-user');
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual([
      'https://api.example.com/api/v1/users', 'https://api.example.com/api/v1/users',
      'https://api.example.com/api/v1/users/test-user', 'https://api.example.com/api/v1/users/test-user',
    ]);
  });

  it('routes direct health and log requests through the same origin without configuration', async () => {
    vi.stubEnv('VITE_API_URL', undefined);
    const { systemApi, observabilityApi } = await import('./api');
    expect(await systemApi.getHealth()).toBe(true);
    await observabilityApi.getLogs();
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual(['/health', '/api/v1/logs']);
  });
  it('exports comma-separated selected IDs with authentication and the configured API origin', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    const { rulesApi } = await import('./api');
    await rulesApi.exportRules(['first', 'second']);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin).toBe('https://api.example.com');
    expect(parsed.searchParams.get('ids')).toBe('first,second');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('imports authenticated multipart JSON without forcing a Content-Type boundary', async () => {
    const { rulesApi } = await import('./api');
    await rulesApi.importRules(new File(['[]'], 'rules.json'), 'json');
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-token');
    expect(new Headers(options?.headers).has('Content-Type')).toBe(false);
    expect((options?.body as FormData).get('format')).toBe('json');
  });

});
