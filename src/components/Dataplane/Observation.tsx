import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function ObservationChip({ state }: { state: string }) {
  const { t } = useTranslation();
  const color = ['available', 'ready', 'allocated', 'attached'].includes(state) ? 'success'
    : ['rejected', 'degraded', 'not_ready', 'unavailable', 'conflict', 'detached'].includes(state) ? 'error' : 'default';
  return <Chip size="small" variant="outlined" color={color} label={t(`dataplane.states.${state}`, { defaultValue: state })} />;
}

export function RemoteNotice({ error, loading, empty }: { error?: string; loading?: boolean; empty?: string }) {
  const { t } = useTranslation();
  return <Stack spacing={1}>
    {error && <Alert severity="error">{t('dataplane.fetchError')}：{error}</Alert>}
    {loading && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
      <CircularProgress size={18} /><Typography variant="body2">{t('common.loading')}</Typography>
    </Box>}
    {!loading && !error && empty && <Alert severity="info">{empty}</Alert>}
  </Stack>;
}
