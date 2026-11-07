import { useCallback, useState } from 'react';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { clusterApi } from '../../services/cluster';
import { useDataplaneResource } from '../../hooks/useDataplaneResource';
import type { ClusterReport, IPPool } from '../../types/cluster';
import { metricValue } from '../Dataplane/format';
import { PoolEditor } from './PoolEditor';
import { blockText, poolInput, poolInUse } from './poolInput';
import { ClusterState } from './State';

export function IPPools({ report, autoRefresh, revision, onChanged }: { report: ClusterReport; autoRefresh: boolean; revision: number; onChanged: () => void }) {
  const { t } = useTranslation();
  const tr = (key: string, fallback?: string) => t(`clusterManagement.${key}`, { defaultValue: fallback || key });
  const load = useCallback((signal: AbortSignal) => clusterApi.pools(signal), []);
  const remote = useDataplaneResource(`cluster:pools:${revision}`, load, autoRefresh);
  const [editor, setEditor] = useState<{ pool?: IPPool } | null>(null);
  const [deleting, setDeleting] = useState<IPPool | null>(null);
  const [detail, setDetail] = useState<IPPool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const canWrite = report.can_manage_pools && !remote.error && !remote.loading && !!remote.data;
  const changed = () => { setSaved(true); setEditor(null); setDeleting(null); void remote.refresh(); onChanged(); };
  const mutate = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await operation(); changed(); }
    catch (reason) { const message = reason instanceof Error ? reason.message : String(reason); setError(tr(`error_${message}`, message)); }
    finally { setBusy(false); }
  };
  return <Stack spacing={2}>
    <Alert severity="info">{tr('vipHint')}</Alert>
    {!report.can_manage_pools && <Alert severity="info">{tr('readonly')}</Alert>}
    {error && !deleting && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {saved && <Alert severity="success" onClose={() => setSaved(false)}>{tr('accepted')}</Alert>}
    {remote.error && <Alert severity="error">{tr(`error_${remote.error}`, remote.error)}{remote.data && <Typography variant="body2">{tr('stale')}</Typography>}</Alert>}
    <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={2}>
      <Stack direction="row" gap={1} alignItems="center"><Typography variant="h6" sx={{ flex: 1 }}>{tr('pools')}</Typography><Button startIcon={<Refresh />} disabled={remote.loading} onClick={() => { void remote.refresh(); }}>{t('common.refresh')}</Button><Button startIcon={<Add />} variant="contained" disabled={!canWrite || busy} onClick={() => { setError(''); setEditor({}); }}>{tr('newPool')}</Button></Stack>
      {remote.loading && <LinearProgress aria-label={t('common.loading')} />}
      <TableContainer><Table size="small" aria-label={tr('pools')} sx={{ minWidth: 850 }}>
        <TableHead><TableRow>{['poolName', 'addresses', 'total', 'used', 'available', 'state'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}<TableCell>{t('common.actions')}</TableCell></TableRow></TableHead>
        <TableBody>{remote.data?.items.map(pool => <TableRow key={pool.name} hover>
          <TableCell><Button size="small" onClick={() => setDetail(pool)} sx={{ textTransform: 'none' }}>{pool.name}</Button></TableCell>
          <TableCell sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', maxWidth: 260 }}>{blockText(pool.blocks)}</TableCell>
          <TableCell>{metricValue(pool.total)}</TableCell><TableCell>{metricValue(pool.used)}</TableCell><TableCell>{metricValue(pool.available)}</TableCell>
          <TableCell><ClusterState state={pool.conflict ? 'conflict' : pool.disabled ? 'inactive' : 'configured'} /></TableCell>
          <TableCell><Stack direction="row" gap={0.5} flexWrap="wrap">
            <Button size="small" disabled={!canWrite || busy} onClick={() => { setError(''); setEditor({ pool }); }}>{t('common.edit')}</Button>
            <Button size="small" disabled={!canWrite || busy} onClick={() => { void mutate(() => clusterApi.savePool({ ...poolInput(pool), disabled: !pool.disabled }, false)); }}>{tr(pool.disabled ? 'enable' : 'disable')}</Button>
            <Tooltip title={tr('deleteHint')}><span><Button size="small" color="error" disabled={!canWrite || busy || !pool.disabled || poolInUse(pool)} onClick={() => { setError(''); setDeleting(pool); }}>{t('common.delete')}</Button></span></Tooltip>
          </Stack></TableCell>
        </TableRow>)}{remote.data?.items.length === 0 && <TableRow><TableCell colSpan={7}>{tr('noPools')}</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
    </Stack></Card>
    <Card variant="outlined" sx={{ p: 2.5 }}><Typography variant="h6" sx={{ mb: 2 }}>{tr('services')}</Typography><TableContainer><Table size="small" sx={{ minWidth: 700 }}>
      <TableHead><TableRow>{['service', 'addresses', 'ports', 'allocation', 'reachability'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead>
      <TableBody>{report.lb.services.map(service => <TableRow key={`${service.namespace}/${service.name}`}><TableCell>{service.namespace}/{service.name}</TableCell><TableCell>{service.addresses.join(', ') || '—'}</TableCell><TableCell>{service.ports.join(', ')}</TableCell><TableCell><ClusterState state={service.state} />{service.message && <Typography variant="caption" display="block">{service.message}</Typography>}</TableCell><TableCell><ClusterState state="unknown" /></TableCell></TableRow>)}</TableBody>
    </Table></TableContainer></Card>
    {editor && <PoolEditor pool={editor.pool} onClose={() => setEditor(null)} onSaved={changed} />}
    <Dialog open={!!deleting} onClose={busy ? undefined : () => setDeleting(null)}><DialogTitle>{tr('deletePool')}</DialogTitle><DialogContent><Stack spacing={2}><Typography>{deleting?.name}</Typography><Alert severity="warning">{tr('deleteHint')}</Alert>{error && <Alert severity="error">{error}</Alert>}</Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setDeleting(null)}>{t('common.cancel')}</Button><Button color="error" disabled={busy} onClick={() => { if (deleting) void mutate(() => clusterApi.deletePool(deleting)); }}>{t('common.delete')}</Button></DialogActions></Dialog>
    <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm"><DialogTitle>{detail?.name}</DialogTitle><DialogContent><Stack spacing={2}>
      <Typography variant="subtitle2">{tr('addresses')}</Typography><Typography sx={{ whiteSpace: 'pre-line' }}>{detail && blockText(detail.blocks)}</Typography><Typography variant="subtitle2">{tr('selector')}</Typography><Box component="pre" sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', fontSize: 13 }}>{detail?.service_selector ? JSON.stringify(detail.service_selector, null, 2) : tr('allServices')}</Box>
      <Typography variant="subtitle2">{tr('related')}</Typography>{detail?.services.map(service => <Typography key={service} variant="body2">{service}</Typography>)}{!detail?.services.length && <Typography>—</Typography>}
    </Stack></DialogContent><DialogActions><Button onClick={() => setDetail(null)}>{t('common.close')}</Button></DialogActions></Dialog>
  </Stack>;
}
