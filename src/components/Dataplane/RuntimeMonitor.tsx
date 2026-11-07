import { useCallback } from 'react';
import { Alert, Card, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../../services/dataplane';
import { useDataplaneResource } from '../../hooks/useDataplaneResource';
import { ObservationChip, RemoteNotice } from './Observation';
import { observationTime } from './format';

export function RuntimeMonitor({ autoRefresh }: { autoRefresh: boolean }) {
  const { t } = useTranslation();
  const load = useCallback((signal: AbortSignal) => dataplaneApi.monitor(signal), []);
  const remote = useDataplaneResource('runtime-monitor', load, autoRefresh);
  const report = remote.data;
  return <Card variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
    <Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={600}>{t('dataplane.monitor.title')}</Typography><Chip size="small" label={t(report?.mode === 'observe_and_auto_block' ? 'runtimeAttribution.autoMode' : 'dataplane.observe')} /></Stack>
    <Alert severity="info">{t(report?.mode === 'observe_and_auto_block' ? 'runtimeAttribution.autoHint' : 'dataplane.monitor.hint')}</Alert>
    <RemoteNotice loading={remote.loading && !report} error={remote.error} />
    {remote.error && report && <Alert severity="warning">{t('dataplane.staleData')}</Alert>}
    {report && !report.enabled && <Alert severity="info">{t('dataplane.monitor.unconfigured')}</Alert>}
    {report?.enabled && <>
      <Typography variant="caption" color="text.secondary">{t('dataplane.checkedAt')}：{observationTime(report.checked_at)}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">{report.profiles.map(profile => <Chip key={profile.name} size="small" variant="outlined" label={`${profile.name} · ${profile.namespace} · ${Object.entries(profile.pod_labels).map(([key, value]) => `${key}=${value}`).join(', ')}`} />)}</Stack>
      {report.profiles.some(profile => !profile.allowed_egress_cidrs?.length && !profile.allowed_egress_workloads?.length) && <Alert severity="info">{t('dataplane.monitor.noDependencies')}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1}>{report.sources.map(source => <Card key={source.source} variant="outlined" sx={{ p: 1.5, flex: 1 }}>
        <Stack spacing={1}><Typography variant="body2">{source.source === 'runtime_auto_block' ? t('runtimeAttribution.autoMode') : t(`dataplane.monitor.sources.${source.source}`, { defaultValue: source.source })}</Typography><ObservationChip state={source.state} />
          <Typography variant="caption">{t('dataplane.monitor.sampleInfo', { count: source.samples, skipped: source.skipped })}</Typography>
          {(source.truncated || source.state === 'degraded' || source.state === 'unavailable') && <Typography variant="caption" color="error">{t('dataplane.monitor.incomplete')}</Typography>}
        </Stack></Card>)}</Stack>
      {!report.findings.length && <Alert severity="info">{t('dataplane.monitor.noFindings')}</Alert>}
      {!!report.findings.length && <TableContainer><Table size="small" sx={{ minWidth: 1000 }}>
        <TableHead><TableRow>{['time', 'layer', 'rule', 'target', 'object', 'evidence', 'samples'].map(key => <TableCell key={key}>{t(`dataplane.monitor.columns.${key}`)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{report.findings.slice(0, 100).map(finding => <TableRow key={finding.id}>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{observationTime(finding.last_seen)}</TableCell>
          <TableCell>{t(`dataplane.monitor.sources.${finding.layer}`, { defaultValue: finding.layer })}<Chip size="small" variant="outlined" color={finding.severity === 'high' ? 'error' : 'warning'} label={finding.severity} /></TableCell>
          <TableCell>{finding.rule}<Typography variant="caption" sx={{ display: 'block' }}>{t(`dataplane.monitor.descriptions.${finding.description}`, { defaultValue: finding.description })}</Typography></TableCell>
          <TableCell>{finding.namespace ? `${finding.namespace}/${finding.pod || finding.profile}` : finding.profile}<Typography variant="caption" sx={{ display: 'block' }}>{finding.container || '—'}</Typography></TableCell>
          <TableCell sx={{ maxWidth: 240, overflowWrap: 'anywhere' }}>{finding.object || '—'}<Typography variant="caption" sx={{ display: 'block' }}>{finding.origin && `${finding.origin} → `}{finding.executable}</Typography></TableCell>
          <TableCell>{t(`dataplane.monitor.evidence.${finding.evidence}`, { defaultValue: finding.evidence })}<Typography variant="caption" sx={{ display: 'block' }}>{finding.reported_action || '—'}</Typography></TableCell>
          <TableCell>{finding.samples}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
      <Typography variant="caption" color="text.secondary">{t('dataplane.monitor.retention')}</Typography>
    </>}
  </Stack></Card>;
}
