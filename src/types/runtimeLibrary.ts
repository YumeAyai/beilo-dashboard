/** An upstream source example; catalog presence does not imply installation. */
export interface CommunityPolicy {
  id: string; path: string; title: string; source_url: string; sha256: string;
  collection: 'policylibrary' | 'tracingpolicy'; category: string;
  behavior: 'observe' | 'enforce' | 'other'; hooks: string[]; actions: string[];
  documents: number; importable: boolean; import_reason?: string; yaml?: string;
}
export interface CommunityCatalog {
  repository: string; version: string; commit: string; license: string; sha256: string;
  entries: CommunityPolicy[];
}
/** Requests are bound to a pinned source ID; arbitrary YAML is never submitted. */
export interface CommunityImportInput {
  id: string; namespace: string; name: string; pod_labels: Record<string, string>;
  acknowledge_actions: boolean; preview_sha256?: string;
}
export interface CommunityPreview { yaml: string; sha256: string }
export interface CommunityImportResult { name: string; namespace: string; execution_state: 'unknown'; source_id: string }
