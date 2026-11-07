import { describe, expect, it } from 'vitest';
import { groupRuntimeEvents, policyInput, type PolicyDraft } from './runtimeHelpers';
import { metricValue, observationTime } from './format';

const draft: PolicyDraft = { namespace: 'demo', name: 'watch-files', kind: 'file', labels: 'app=frontend', paths: '/etc/shadow', enforce: false };

describe('runtime policy scope', () => {
  it('requires an explicit nonempty scope before writing a policy', () => {
    expect(() => policyInput({ ...draft, labels: '' })).toThrow('labels');
    expect(() => policyInput({ ...draft, labels: 'app=frontend\napp=backend' })).toThrow('labels');
    expect(() => policyInput({ ...draft, namespace: '' })).toThrow('namespace');
    expect(() => policyInput({ ...draft, name: '../all' })).toThrow('name');
  });
  it('keeps observation explicit and sends only the selected path kind', () => {
    expect(policyInput(draft)).toEqual({ kind: 'file', pod_labels: { app: 'frontend' }, files: ['/etc/shadow'], enforce: false });
    expect(policyInput({ ...draft, kind: 'exec', paths: '/usr/bin/curl', enforce: true })).toEqual({ kind: 'exec', pod_labels: { app: 'frontend' }, executables: ['/usr/bin/curl'], enforce: true });
  });
  it('rejects relative or ambiguous paths and respects kernel selector limits', () => {
    for (const paths of ['curl', '/', '/tmp/../etc/shadow', '/etc//shadow']) expect(() => policyInput({ ...draft, paths })).toThrow('paths');
    expect(() => policyInput({ ...draft, paths: Array.from({ length: 11 }, (_, i) => `/tmp/file${i}`).join('\n') })).toThrow('paths');
  });
});

describe('runtime samples', () => {
  it('keeps UDP datagrams separate even when their peer and server socket match', () => {
    const base = { time: '2026-11-03T00:00:00Z', type: 'process_lsm', pid: 10, tid: 11, exec_id: 'execution-1' };
    const correlation = { state: 'datagram' as const, datagram_id: 'packet-1', source_ip: '192.0.2.1', source_verified: false };
    expect(groupRuntimeEvents([{ ...base, correlation }, { ...base, correlation: { ...correlation, datagram_id: 'packet-2' } }])).toHaveLength(2);
  });
  it('keeps different executions and requests separate on a reused worker', () => {
    const base = { time: '2026-11-03T00:00:00Z', type: 'process_lsm', pid: 10, tid: 11, exec_id: 'execution-1' };
    const correlation = { state: 'request' as const, request_id: 'request-1', source_ip: '192.0.2.1', source_verified: true };
    const groups = groupRuntimeEvents([{ ...base, correlation }, { ...base, correlation: { ...correlation, request_id: 'request-2', source_ip: '192.0.2.2' } }, { ...base, exec_id: 'replacement-execution', correlation }]);
    expect(groups).toHaveLength(3);
    expect(groups.every(group => group.count === 1)).toBe(true);
  });
  it('groups repeated process events without collapsing different PIDs or actions', () => {
    const base = { time: '2026-10-31T00:00:00Z', type: 'process_lsm', policy: 'files', pod: 'web', pid: 10, action: 'KPROBE_ACTION_POST' };
    const events = groupRuntimeEvents([base, { ...base, time: '2026-10-31T00:00:02Z' }, { ...base, pid: 11 }, { ...base, action: 'KPROBE_ACTION_OVERRIDE' }]);
    expect(events).toHaveLength(3);
    expect(events[0].count).toBe(2);
    expect(events[0].first_time).toBe(base.time);
    expect(events[0].time).toBe('2026-10-31T00:00:02Z');
  });
  it('does not turn unavailable counters and timestamps into successful zeroes', () => {
    expect(metricValue(null)).toBe('—');
    expect(metricValue(0)).toBe('0');
    expect(observationTime('invalid')).toBe('—');
    expect(observationTime(null)).toBe('—');
  });
});
