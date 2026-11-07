/**
 * Labels utility functions for parsing Kubernetes/Cilium labels
 * Adapted from Hubble UI's labels.ts
 */

export interface KV {
  key: string;
  value: string;
}

const prefixes = ['any:', 'k8s:', 'cni:', 'io.kubernetes.pod.', 'app.kubernetes.io/', 'covalent.io/'];

const appNameNormalizedKeys = new Set(['app', 'name', 'functionname', 'k8s-app']);

const innerSeparatorsRe = /[-./=]/g;

const reservedLabelSet = new Set([
  'reserved:host',
  'reserved:kube-apiserver',
  'reserved:world',
  'reserved:world-ipv4',
  'reserved:world-ipv6',
  'reserved:health',
  'reserved:init',
  'reserved:ingress',
  'reserved:remote-node',
  'reserved:unmanaged',
  'reserved:unknown',
]);

function internalNormalizeKey(key: string): string {
  const trimmed = key.toLowerCase().replace(/=+$/, '');
  return prefixes.reduce((acc, val) => acc.replace(val, ''), trimmed);
}

function normalizeLabel(lbl: KV): KV {
  return {
    key: internalNormalizeKey(lbl.key),
    value: lbl.value,
  };
}

function containsKey(lbl: KV, nkeys: Iterable<string>): boolean {
  const targetKeys = new Set(nkeys);
  const kv = normalizeLabel(lbl);
  return targetKeys.has(kv.key);
}

function getReservedAppName(lbl: KV): string | null {
  const kv = normalizeLabel(lbl);
  const key = kv.key;
  if (reservedLabelSet.has(key)) {
    return key.replace('reserved:', '');
  }
  return null;
}

function containsKeyPart(lbl: KV, tkeys: Iterable<string>): boolean {
  const kv = normalizeLabel(lbl);
  const nkey = kv.key;
  const parts = nkey.split(innerSeparatorsRe);
  const targetKeys = new Set<string>();
  for (const key of tkeys) {
    targetKeys.add(internalNormalizeKey(key));
  }
  return parts.some(part => targetKeys.has(part));
}

function getAppNameFromLabel(lbl: KV): string | null {
  const kv = normalizeLabel(lbl);

  // Check for explicit app name label
  if (containsKey(lbl, appNameNormalizedKeys)) {
    return kv.value;
  }

  // Use reserved label (reserved:remote-node -> remote-node)
  const reservedAppName = getReservedAppName(kv);
  if (reservedAppName) return reservedAppName;

  return null;
}

function findAppNameFromLabelsParts(labels: KV[]): string | null {
  for (const lbl of labels) {
    const kv = normalizeLabel(lbl);
    const hasAppPartInKey = containsKeyPart(kv, appNameNormalizedKeys);
    if (hasAppPartInKey) return kv.value;
  }
  return null;
}

/**
 * Find the app name from a list of labels
 * Priority: explicit app name > reserved labels > partial key matches
 */
export function findAppNameInLabels(labels: KV[]): string | null {
  for (const lbl of labels) {
    const kv = normalizeLabel(lbl);
    const appName = getAppNameFromLabel(kv);
    if (appName) return appName;
  }

  // Fallback: find app name from label key parts
  return findAppNameFromLabelsParts(labels);
}

/**
 * Find namespace in labels
 */
export function findNamespaceInLabels(labels: KV[]): string | null {
  for (const lbl of labels) {
    const kv = normalizeLabel(lbl);
    if (kv.key === 'namespace') return kv.value;
  }
  return null;
}

/**
 * Convert string labels to KV array
 */
export function labelsToKV(labels: string[]): KV[] {
  return labels.map(l => {
    const [key, ...rest] = l.split('=');
    return { key, value: rest.join('=') };
  });
}

/**
 * Parse app name and namespace from flow labels
 */
export function parseFlowLabels(labels: string[]): {
  appName: string | null;
  namespace: string | null;
} {
  const kvs = labelsToKV(labels);
  const appName = findAppNameInLabels(kvs);
  const namespace = findNamespaceInLabels(kvs);
  return { appName, namespace };
}

/**
 * Normalize a label key (remove prefixes)
 */
export function normalizeKey(key: string): string {
  return internalNormalizeKey(key);
}

/**
 * Normalize a label to a key-value string representation
 */
export function normalizeLabelToString(label: KV): string {
  let str = internalNormalizeKey(label.key);
  if (label.value) str += `=${label.value}`;
  return str;
}
