import { Alert, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ObservationMetadata } from '../types/observability';

export function ObservationNotice({ metadata }: { metadata?: ObservationMetadata }) {
  const { t } = useTranslation();
  if (!metadata) return null;
  const entries = Object.entries(metadata.fields);
  const missing = entries.filter(([, field]) => field.state === 'unavailable' || field.reason === 'http_stream_disconnected');
  if (!missing.length) return null;
  const labels = (fields: typeof entries) => [...new Set(fields.map(([name]) => t(`observability.fields.${name}`, { defaultValue: t('observability.fields.other') })))].join(t('observability.separator'));
  return <Alert severity="warning" sx={{ mb: 2 }}>
    {t('observability.unavailableFields', { fields: labels(missing) })}
  </Alert>;
}

export function ObservationCoverage({ metadata, field }: { metadata?: ObservationMetadata; field: string }) {
  const { t } = useTranslation();
  const observed = metadata?.fields[field];
  if (!observed || observed.source === 'prometheus' || observed.state === 'available') return null;
  const label = observed.reason === 'http_stream_disconnected' ? t('observability.notAvailable')
    : observed.state === 'empty' ? t('observability.noRecords')
    : observed.state === 'unconfigured' ? t('observability.notEnabled')
    : observed.state === 'unavailable' ? t('observability.notAvailable')
    : t('observability.liveObservations');
  return <Tooltip title={t('observability.sampleCoverage')}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Tooltip>;
}
