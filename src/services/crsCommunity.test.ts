// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { checkCrsCommunity, compareCrsVersions, crsUpgradePlan, parseCrsRelease } from './crsCommunity';

const official = { tag_name: 'v4.15.0', html_url: 'https://github.com/coreruleset/coreruleset/releases/tag/v4.15.0', published_at: '2026-01-01T00:00:00Z', draft: false, prerelease: false, body: 'Release notes' };
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('checks the official source without forwarding Beilo authentication', async () => {
  localStorage.setItem('beilo_auth_token', 'private-beilo-session');
  const fetcher = vi.fn(async () => new Response(JSON.stringify(official)));
  vi.stubGlobal('fetch', fetcher);
  expect((await checkCrsCommunity()).version).toBe('4.15.0');
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.github.com/repos/coreruleset/coreruleset/releases/latest');
  expect(new Headers(init.headers).has('Authorization')).toBe(false);
  expect(init.credentials).toBe('omit');
});

it('rejects preview versions and external release URLs', () => {
  expect(() => parseCrsRelease({ ...official, prerelease: true })).toThrow();
  expect(() => parseCrsRelease({ ...official, html_url: 'https://untrusted.example/download' })).toThrow();
  expect(() => parseCrsRelease({ ...official, tag_name: 'v5.0.0' })).toThrow();
});

it('compares numeric semantic versions and never claims an upgrade plan was installed', () => {
  expect(compareCrsVersions('4.15.0', '4.9.0')).toBe(1);
  expect(compareCrsVersions('4.14.0', '4.14.0')).toBe(0);
  expect(compareCrsVersions('4.13.0', '4.14.0')).toBe(-1);
  const plan = crsUpgradePlan(parseCrsRelease(official), '4.14.0', 'reference-hash');
  expect(plan.state).toBe('planned');
  expect(plan.deployedVersion).toBeNull();
  expect(plan.moduleSHA256).toBeNull();
  expect(plan.steps).toContain('stage_module_without_activation');
});

it('propagates rate-limit and network failures instead of substituting a fake latest version', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
  await expect(checkCrsCommunity()).rejects.toThrow('GitHub HTTP 403');
});
