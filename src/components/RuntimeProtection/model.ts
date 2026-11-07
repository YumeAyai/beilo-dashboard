import type { RuntimeEvent } from '../../types/dataplane';

export type RuntimeAction = 'override' | 'sigkill' | 'signal' | 'post' | 'other';

/** Classify only explicit actions. Unknown actions must not imply enforcement. */
export function runtimeAction(action?: string): RuntimeAction {
  const value = action?.trim().toLowerCase().replace(/^kprobe_action_/, '');
  return value === 'override' || value === 'sigkill' || value === 'signal' || value === 'post' ? value : 'other';
}

export function isEnforcementReport(event: RuntimeEvent): boolean {
  return ['override', 'sigkill', 'signal'].includes(runtimeAction(event.action));
}

/** Namespaces are part of workload identity; missing Pods cannot establish identity. */
export function runtimeWorkloads(events: RuntimeEvent[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.namespace || !event.pod) continue;
    const key = `${event.namespace}/${event.pod}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
