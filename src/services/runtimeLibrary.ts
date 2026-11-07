import { dataplaneRequest } from './dataplane';
import type { CommunityCatalog, CommunityPolicy, CommunityImportInput, CommunityPreview, CommunityImportResult } from '../types/runtimeLibrary';

const base = '/api/v1/runtime/policy-library';
/** Reads the offline source catalog through the existing authenticated API. */
export const runtimeLibraryApi = {
  catalog: (signal?: AbortSignal) => dataplaneRequest<CommunityCatalog>(base, { signal }),
  detail: (id: string, signal?: AbortSignal) => dataplaneRequest<CommunityPolicy>(`${base}?${new URLSearchParams({ id })}`, { signal }),
  preview: (input: CommunityImportInput) => dataplaneRequest<CommunityPreview>(`${base}/preview`, { method: 'POST', body: JSON.stringify(input) }),
  importPolicy: (input: CommunityImportInput) => dataplaneRequest<CommunityImportResult>(`${base}/import`, { method: 'POST', body: JSON.stringify(input) }),
};
