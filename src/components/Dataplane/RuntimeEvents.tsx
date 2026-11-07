import { useCallback, useMemo, useState } from 'react';
import { Alert, Card, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../../services/dataplane';
import { useDataplaneResource } from '../../hooks/useDataplaneResource';
import { RemoteNotice } from './Observation';
import { observationTime } from './format';
import { groupRuntimeEvents } from './runtimeHelpers';

export function RuntimeEvents({ autoRefresh }: { autoRefresh: boolean }) {
  const { t } = useTranslation();
  const [duration, setDuration] = useState('1h');
  const [search, setSearch] = useState('');
  const load = useCallback((signal: AbortSignal) => dataplaneApi.events(duration, signal), [duration]);
  const remote = useDataplaneResource(`events:${duration}`, load, autoRefresh);
  const grouped = useMemo(() => groupRuntimeEvents(remote.data?.events || []), [remote.data]);
  const filtered = grouped.filter(event => [event.namespace, event.pod, event.node, event.policy, event.executable, event.file].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  return <Card variant="outlined" sx={{ p: 2 }}>
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
        <Typography fontWeight={600} sx={{ flex: 1 }}>{t('dataplane.events')}</Typography>
        <TextField size="small" label={t('dataplane.sampleSearch')} value={search} onChange={event => setSearch(event.target.value)} />
        <TextField select size="small" label={t('dataplane.window')} value={duration} onChange={event => setDuration(event.target.value)}>
          {['15m', '1h', '6h', '24h'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <Tooltip title={t('common.refresh')}><span><IconButton aria-label={t('common.refresh')} disabled={remote.loading} onClick={() => { void remote.refresh(); }}><Refresh /></IconButton></span></Tooltip>
      </Stack>
      <Alert severity="info">{t('dataplane.eventsHint')}</Alert>
      <RemoteNotice loading={remote.loading} error={remote.error} empty={remote.data && filtered.length === 0 ? t('dataplane.noEvents') : undefined} />
      {remote.data && <Typography variant="caption" color="text.secondary">
        {t('dataplane.eventSample', { count: remote.data.events.length, skipped: remote.data.skipped })}
      </Typography>}
      {remote.data?.possibly_truncated && <Alert severity="warning">{t('dataplane.eventTruncated')}</Alert>}
      {filtered.length > 0 && <TableContainer><Table size="small">
        <TableHead><TableRow>{['time', 'workload', 'policyName', 'hook', 'reportedAction', 'resource', 'sampleCount'].map(key => <TableCell key={key}>{t(`dataplane.${key}`)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{filtered.map((event, index) => <TableRow key={index}>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{observationTime(event.time)}</TableCell>
          <TableCell>{event.namespace || '—'}/{event.pod || '—'}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{event.node || '—'} · PID {event.pid ?? '—'}</Typography></TableCell>
          <TableCell>{event.policy || '—'}</TableCell><TableCell>{event.function || event.type}</TableCell>
          <TableCell>{event.action || '—'}</TableCell>
          <TableCell sx={{ maxWidth: 260, overflowWrap: 'anywhere' }}>{event.executable || '—'}{event.file && <Typography variant="caption" sx={{ display: 'block' }}>{event.file}</Typography>}</TableCell>
          <TableCell>{event.count}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
    </Stack>
  </Card>;
}
