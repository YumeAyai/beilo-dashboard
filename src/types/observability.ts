export interface FieldObservation {
  state: 'available' | 'partial' | 'empty' | 'unconfigured' | 'unavailable';
  source: string;
  scope: string;
  unit: string;
  reason?: string;
}

// Optional extension to the existing business APIs. Old servers remain readable.
export interface ObservationMetadata {
  version: string;
  start?: string;
  end?: string;
  collectedAt: string;
  fields: Record<string, FieldObservation>;
}

export function displayObserved(value: number | undefined, metadata: ObservationMetadata | undefined, field: string): string {
  const observation = metadata?.fields[field];
  if (value === undefined || !Number.isFinite(value)) return '—';
  if (observation && observation.state !== 'available' && observation.state !== 'partial') return '—';
  return `${observation?.state === 'partial' && observation.source !== 'prometheus' ? '≥' : ''}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function observationIncomplete(metadata?: ObservationMetadata): boolean {
  return !!metadata && Object.values(metadata.fields).some(field => field.state !== 'available');
}


export interface ProtectionCounter {
  count: number | null;
  status: FieldObservation;
}

export interface ProtectionCounters {
  runtime?: ProtectionCounter;
  waf: ProtectionCounter;
  xdp: ProtectionCounter;
  cnp: ProtectionCounter;
}
