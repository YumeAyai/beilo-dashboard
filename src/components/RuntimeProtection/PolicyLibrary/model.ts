import type { CommunityImportInput, CommunityPolicy } from '../../../types/runtimeLibrary';
import { PolicyValidationError } from '../../Dataplane/runtimeHelpers';

export interface CommunityDraft { namespace: string; name: string; labels: string; acknowledged: boolean }

/** Preserves explicit Pod scope; Kubernetes performs final selector validation. */
export function communityInput(id: string, draft: CommunityDraft): CommunityImportInput {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(draft.namespace) || draft.namespace.length > 63) throw new PolicyValidationError('namespace');
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(draft.name) || draft.name.length > 253) throw new PolicyValidationError('name');
  const labels: Record<string, string> = {};
  for (const line of draft.labels.split('\n').map(value => value.trim()).filter(Boolean)) {
    const split = line.indexOf('=');
    const key = line.slice(0, split).trim();
    if (split < 1 || Object.hasOwn(labels, key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new PolicyValidationError('labels');
    labels[key] = line.slice(split + 1).trim();
  }
  if (!Object.keys(labels).length) throw new PolicyValidationError('labels');
  return { id, namespace: draft.namespace, name: draft.name, pod_labels: labels, acknowledge_actions: draft.acknowledged };
}

/** Searches upstream titles, source paths, hook names and action names. */
export function filterCommunityPolicies(entries: CommunityPolicy[], search: string, category: string, behavior: string): CommunityPolicy[] {
  const needle = search.trim().toLowerCase();
  return entries.filter(entry => (!category || entry.category === category) && (!behavior || entry.behavior === behavior) &&
    [entry.title, entry.path, ...entry.hooks, ...entry.actions].join(' ').toLowerCase().includes(needle));
}
