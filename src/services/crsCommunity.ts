// Community metadata is public. Never attach the Beilo session to this request.
export const CRS_RELEASES_URL = 'https://github.com/coreruleset/coreruleset/releases';
const API = 'https://api.github.com/repos/coreruleset/coreruleset/releases/latest';
const REPOSITORY = 'https://github.com/coreruleset/coreruleset';

export interface CrsRelease {
  version: string;
  tag: string;
  url: string;
  sourceURL: string;
  publishedAt: string;
  notes: string;
}

export function parseCrsRelease(raw: unknown): CrsRelease {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid CRS release metadata');
  const release = raw as Record<string, unknown>;
  if (typeof release.tag_name !== 'string' || !/^v?4\.\d+\.\d+$/.test(release.tag_name) || release.draft !== false || release.prerelease !== false) {
    throw new Error('No supported stable CRS 4.x release');
  }
  const expectedURL = `${REPOSITORY}/releases/tag/${release.tag_name}`;
  if (release.html_url !== expectedURL || typeof release.published_at !== 'string' || !Number.isFinite(Date.parse(release.published_at))) {
    throw new Error('Invalid official CRS release source');
  }
  return {
    version: release.tag_name.replace(/^v/, ''), tag: release.tag_name, url: expectedURL,
    sourceURL: `${REPOSITORY}/archive/refs/tags/${release.tag_name}.tar.gz`,
    publishedAt: release.published_at, notes: typeof release.body === 'string' ? release.body.slice(0, 30000) : '',
  };
}

export function compareCrsVersions(candidate: string, current: string): number {
  const parse = (version: string) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid CRS version');
    return version.split('.').map(Number);
  };
  const next = parse(candidate), previous = parse(current);
  for (let i = 0; i < 3; i++) if (next[i] !== previous[i]) return next[i] > previous[i] ? 1 : -1;
  return 0;
}

export async function checkCrsCommunity(signal?: AbortSignal): Promise<CrsRelease> {
  const response = await fetch(API, {
    headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', referrerPolicy: 'no-referrer',
    signal: signal || AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return parseCrsRelease(await response.json());
}

export function crsUpgradePlan(release: CrsRelease, currentReference: string, referenceSHA256: string) {
  return {
    schema: 'beilo.crs.upgrade-plan.v1', state: 'planned',
    source: { repository: REPOSITORY, tag: release.tag, version: release.version, releaseURL: release.url, archiveURL: release.sourceURL, archiveSHA256: null },
    reference: { version: currentReference, sha256: referenceSHA256 },
    deployedVersion: null, moduleSHA256: null,
    steps: ['verify_source_integrity', 'update_custom_coraza_crs_sources', 'run_coraza_compatibility_and_regression_tests', 'build_wasm_and_calculate_binary_sha256', 'stage_module_without_activation', 'verify_all_envoy_agents_ready', 'canary_with_pinned_module_sha256', 'verify_active_configuration_and_real_requests', 'activate_or_rollback'],
  };
}
