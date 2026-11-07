import { describe, expect, it } from 'vitest';
import { isEnforcementReport, runtimeAction, runtimeWorkloads } from './model';
import type { RuntimeEvent } from '../../types/dataplane';

const event: RuntimeEvent = { time: '', type: 'process_lsm' };
describe('runtime observation semantics', () => {
  it('recognizes explicit actions without interpreting arbitrary strings as blocking', () => {
    expect(runtimeAction(' KPROBE_ACTION_OVERRIDE ')).toBe('override');
    expect(runtimeAction('Sigkill')).toBe('sigkill');
    expect(runtimeAction('KPROBE_ACTION_SIGNAL')).toBe('signal');
    for (const action of [undefined, 'KPROBE_ACTION_POST', 'NOPOST', 'blocked', 'override_failed']) {
      expect(isEnforcementReport({ ...event, action })).toBe(false);
    }
  });
  it('does not merge equal Pod names in different namespaces or count incomplete identities', () => {
    expect(runtimeWorkloads([{ ...event, namespace: 'prod', pod: 'web' }, { ...event, namespace: 'prod', pod: 'web' }, { ...event, namespace: 'dev', pod: 'web' }, { ...event, namespace: 'prod' }, { ...event, pod: 'web' }])).toEqual([['prod/web', 2], ['dev/web', 1]]);
  });
});
