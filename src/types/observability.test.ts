import { describe, expect, it } from 'vitest';
import { displayObserved, observationIncomplete, type ObservationMetadata } from './observability';

function metadata(state: ObservationMetadata['fields'][string]['state']): ObservationMetadata {
  return { version: 'v1', collectedAt: new Date().toISOString(), fields: { totalRequests: { state, source: 'prometheus', unit: 'requests', scope: 'envoy_downstream_http' } } };
}

describe('business metric availability', () => {
  it('distinguishes a measured zero from a missing or failed observation', () => {
    expect(displayObserved(0, metadata('available'), 'totalRequests')).toBe('0');
    for (const state of ['empty', 'unavailable', 'unconfigured'] as const) expect(displayObserved(0, metadata(state), 'totalRequests')).toBe('—');
  });
  it('labels bounded audit counts and retains old-server compatibility', () => {
    expect(displayObserved(12, metadata('partial'), 'totalRequests')).toBe('12');
    const audit = metadata('partial');
    audit.fields.totalRequests.source = 'loki';
    expect(displayObserved(12, audit, 'totalRequests')).toBe('≥12');
    expect(displayObserved(0, undefined, 'totalRequests')).toBe('0');
    expect(displayObserved(Number.NaN, undefined, 'totalRequests')).toBe('—');
    expect(observationIncomplete(metadata('partial'))).toBe(true);
    expect(observationIncomplete(metadata('available'))).toBe(false);
  });
});
