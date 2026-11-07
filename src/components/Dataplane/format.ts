export function metricValue(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString();
}

export function observationTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
