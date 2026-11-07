import { fetchApi, postApi } from './api';
import type { CrsRelease } from './crsCommunity';

export interface BuildRelease extends CrsRelease { commit: string }
export interface CrsBuild {
  id: string;
  release: BuildRelease;
  builderImage: string;
  baseSHA256: string;
  createdAt: string;
  state: 'pending' | 'building' | 'failed' | 'built' | 'staged' | 'selected' | 'expired' | 'unavailable';
  reason?: string;
  artifact?: { moduleSHA256: string; archiveSHA256: string; testsPassed: boolean };
}
export interface CrsBuildStatus {
  enabled: boolean;
  buildConfigured?: boolean;
  inventoryState?: 'ready' | 'unmanaged' | 'missing' | 'invalid' | 'unavailable' | 'not_configured';
  inventoryError?: string;
  configurationError?: string;
  activeSHA256: string;
  modules: Array<{ sha256: string; url: string }>;
  builds: CrsBuild[];
}
export interface CrsRuleCatalog {
  version: string; moduleSHA256: string; commit: string; archiveSHA256: string;
  source: string; sourceSHA256: string; scope: 'module_source'; license: string;
  groups: Array<{ file: string; count: number }>;
  rules: Array<{ id: string; file: string; message: string; severity: string; phase: number | null; tags: string[]; directive: string }>;
}
export const crsBuildApi = {
  check: (signal?: AbortSignal) => postApi<BuildRelease>('/api/v1/waf/crs/check', undefined, signal),
  status: () => fetchApi<CrsBuildStatus>('/api/v1/waf/crs/status', undefined, AbortSignal.timeout(12000)),
  catalog: (sha256: string, signal?: AbortSignal) => fetchApi<CrsRuleCatalog>('/api/v1/waf/crs/catalog', { sha256 }, signal),
  start: (release: BuildRelease, retryOf?: string) => postApi<CrsBuild>('/api/v1/waf/crs/builds', { tag: release.tag, commit: release.commit, ...(retryOf ? { retryOf } : {}) }),
  stage: (id: string) => postApi<CrsBuild>('/api/v1/waf/crs/stage', { id }),
  select: (sha256: string, expectedActive: string) => postApi<{ state: string }>('/api/v1/waf/crs/select', { sha256, expectedActive }),
};
