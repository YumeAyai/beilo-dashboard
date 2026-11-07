import type { RuntimeEvent, RuntimePolicyInput } from '../../types/dataplane';

export interface PolicyDraft { name: string; namespace: string; kind: 'exec' | 'file'; labels: string; paths: string; enforce: boolean }
export class PolicyValidationError extends Error {}

/** Parses an explicit Pod selector and bounded exact paths; the API validates Kubernetes semantics. */
export function policyInput(draft: PolicyDraft): RuntimePolicyInput {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(draft.namespace) || draft.namespace.length > 63) throw new PolicyValidationError('namespace');
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(draft.name) || draft.name.length > 253) throw new PolicyValidationError('name');
  const podLabels: Record<string, string> = {};
  for (const line of draft.labels.split('\n').map(value => value.trim()).filter(Boolean)) {
    const split = line.indexOf('=');
    const key = line.slice(0, split).trim();
    if (split < 1 || Object.hasOwn(podLabels, key) || key === '__proto__' || key === 'constructor') throw new PolicyValidationError('labels');
    podLabels[key] = line.slice(split + 1).trim();
  }
  if (Object.keys(podLabels).length === 0) throw new PolicyValidationError('labels');
  const paths = [...new Set(draft.paths.split('\n').map(value => value.trim()).filter(Boolean))];
  const limit = draft.kind === 'exec' ? 20 : 10;
  if (!paths.length || paths.length > limit || paths.some(path => !path.startsWith('/') || path.includes('\0') || path.slice(1).split('/').some(part => !part || part === '.' || part === '..'))) throw new PolicyValidationError('paths');
  return { kind: draft.kind, pod_labels: podLabels, enforce: draft.enforce, ...(draft.kind === 'exec' ? { executables: paths } : { files: paths }) };
}

export interface GroupedRuntimeEvent extends RuntimeEvent { count: number; first_time: string }

/** Groups identical process/policy fields within this sample, without counting attacks. */
export function groupRuntimeEvents(events: RuntimeEvent[]): GroupedRuntimeEvent[] {
  const groups = new Map<string, GroupedRuntimeEvent>();
  for (const event of events) {
    const key = JSON.stringify([event.node, event.namespace, event.pod, event.container, event.pid, event.exec_id, event.tid, event.policy, event.function, event.action, event.executable, event.file, event.type, event.correlation?.state, event.correlation?.request_id, event.correlation?.source_ip, event.correlation?.socket?.cookie, event.correlation?.socket?.inode, event.correlation?.datagram_id, event.correlation?.connection_id]);
    const previous = groups.get(key);
    if (!previous) groups.set(key, { ...event, first_time: event.time, count: 1 });
    else {
      previous.count += 1;
      if (event.time > previous.time) previous.time = event.time;
      if (event.time < previous.first_time) previous.first_time = event.time;
    }
  }
  return [...groups.values()].sort((a, b) => b.time.localeCompare(a.time));
}
