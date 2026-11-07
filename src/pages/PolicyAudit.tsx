import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { HistoryOutlined, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { CommonChip } from '../components/Common/CommonChip';
import { policyAuditApi } from '../services/policyAudit';
import type { PolicyAuditEvent, PolicyAuditStatus } from '../services/policyAudit';

const statusValue = (value: string) => ({ success: 'success', failed: 'error', pending: 'pending', unknown: 'unknown', dry_run: 'monitoring' })[value] || 'unknown';
const when = (value?: string) => value && !value.startsWith('0001-') ? new Date(value).toLocaleString() : '—';
const json = (value: unknown) => JSON.stringify(value, null, 2) ?? 'null';

export function PolicyAudit() {
  const { t } = useTranslation();
  const tr = (key: string, fallback?: string) => t(`policyAudit.${key}`, { defaultValue: fallback || key });
  const [filters, setFilters] = useState({ domain: '', actor: '', object: '', result: '', start: '', end: '', operationId: '' });
  const [records, setRecords] = useState<PolicyAuditEvent[]>([]);
  const [cursor, setCursor] = useState('');
  const [status, setStatus] = useState<PolicyAuditStatus>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<PolicyAuditEvent>();
  const [detailError, setDetailError] = useState('');
  const [detailBusy, setDetailBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const load = useCallback(async (after = '') => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      const params: Record<string, string> = { ...filters, limit: '50', cursor: after };
      for (const field of ['start', 'end']) if (params[field]) params[field] = new Date(params[field]).toISOString();
      const [page, sourceStatus] = await Promise.all([policyAuditApi.list(params, controller.signal), policyAuditApi.status(controller.signal)]);
      if (controller.signal.aborted) return;
      setRecords(previous => after ? [...previous, ...page.events.filter(item => !previous.some(old => old.id === item.id))] : page.events);
      setCursor(page.nextCursor); setStatus(sourceStatus);
    } catch (cause) {
      if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : String(cause)); setStatus(undefined); }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }, [filters]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setRecords([]); setCursor(''); void load(); }, 250);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [load]);
  useEffect(() => () => { detailRequest.current?.abort(); }, []);
  const open = async (record: PolicyAuditEvent) => {
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
    setSelected(record); setDetailBusy(true); setDetailError('');
    try { const detail = await policyAuditApi.detail(record.id, controller.signal); if (!controller.signal.aborted) setSelected(detail); }
    catch (cause) { if (!controller.signal.aborted) setDetailError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (!controller.signal.aborted) setDetailBusy(false); }
  };
  const close = () => { detailRequest.current?.abort(); setSelected(undefined); };
  const code = (value: unknown) => <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'action.hover', borderRadius: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12, maxHeight: 400, overflow: 'auto' }}>{json(value)}</Box>;
  return <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1800, mx: 'auto' }}>
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box><Stack direction="row" spacing={1} alignItems="center"><HistoryOutlined color="primary" /><Typography variant="h5" fontWeight={600}>{tr('title')}</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{tr('subtitle')}</Typography></Box>
        <Button startIcon={<Refresh />} onClick={() => void load()} disabled={busy}>{tr('refresh')}</Button>
      </Stack>
      <Card><CardContent><Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center"><CommonChip type="status" value={status?.externalAuditHealthy ? 'success' : 'warning'} label={tr(status?.externalAuditHealthy ? 'healthy' : 'unhealthy')} />{busy && <CircularProgress size={16} />}</Stack>
        <Typography variant="body2" color="text.secondary">{tr('coverageNote')}</Typography>
        {status?.storageMode && status.storageMode !== 'durable' && <Alert severity="error">{tr('storageUnavailable')}</Alert>}
        {status?.sources.length === 0 && <Typography variant="body2" color="text.secondary">{tr('noSources')}</Typography>}
        {status?.sources.map(source => <Stack key={source.node} direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 3 }}>
          <Typography variant="body2">{tr('node')}: {source.node}</Typography><Typography variant="body2" color="text.secondary">{tr('coverage')}: {when(source.coverageStart)}</Typography><Typography variant="body2" color="text.secondary">{tr('heartbeat')}: {when(source.readAt)}</Typography>
          {source.error && <Typography variant="body2" color="error">{source.error}</Typography>}
        </Stack>)}
      </Stack></CardContent></Card>
      <Card><CardContent><Stack direction="row" flexWrap="wrap" gap={2}>
        <TextField select size="small" label={tr('domain')} value={filters.domain} onChange={e => setFilters({ ...filters, domain: e.target.value })} sx={{ minWidth: 140 }}><MenuItem value="">{tr('all')}</MenuItem><MenuItem value="waf">WAF</MenuItem><MenuItem value="tetragon">Tetragon</MenuItem></TextField>
        <TextField size="small" label={tr('actor')} value={filters.actor} onChange={e => setFilters({ ...filters, actor: e.target.value })} />
        <TextField size="small" label={tr('object')} value={filters.object} onChange={e => setFilters({ ...filters, object: e.target.value })} sx={{ minWidth: 240 }} />
        <TextField select size="small" label={tr('result')} value={filters.result} onChange={e => setFilters({ ...filters, result: e.target.value })} sx={{ minWidth: 140 }}><MenuItem value="">{tr('all')}</MenuItem>{['success', 'failed', 'pending', 'unknown', 'dry_run'].map(result => <MenuItem key={result} value={result}>{tr(`results.${result}`)}</MenuItem>)}</TextField>
        {(['start', 'end'] as const).map(field => <TextField key={field} size="small" type="datetime-local" label={tr(field)} InputLabelProps={{ shrink: true }} value={filters[field]} onChange={e => setFilters({ ...filters, [field]: e.target.value })} />)}
        {filters.operationId && <Button onClick={() => setFilters({ ...filters, operationId: '' })}>{tr('clearCorrelation')}</Button>}
      </Stack></CardContent>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>{tr('retry')}</Button>}>{error}</Alert>}
      <TableContainer><Table size="small" sx={{ minWidth: 940 }}><TableHead><TableRow>{['time', 'actor', 'source', 'object', 'action', 'phase', 'result', 'details'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{records.map(record => <TableRow key={record.id} hover>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{when(record.time)}</TableCell><TableCell sx={{ maxWidth: 200, overflowWrap: 'anywhere' }}>{record.actor.name || record.actor.id}</TableCell><TableCell>{tr(`sources.${record.source}`, record.source)}</TableCell>
          <TableCell sx={{ maxWidth: 340, overflowWrap: 'anywhere' }}>{record.changes.slice(0, 2).map((change, i) => <Box key={i}><Typography variant="body2">{[change.namespace, change.name].filter(Boolean).join('/')}</Typography><Typography variant="caption" color="text.secondary">{change.domain.toUpperCase()} · {change.resource}</Typography></Box>)}{record.changes.length > 2 && <Typography variant="caption">+{record.changes.length - 2}</Typography>}</TableCell>
          <TableCell>{Array.from(new Set(record.changes.map(change => change.operation))).map(op => tr(`operations.${op}`, op)).join(', ')}</TableCell><TableCell>{tr(`phases.${record.phase}`, record.phase)}</TableCell><TableCell><CommonChip type="status" value={statusValue(record.result)} label={tr(`results.${record.result}`, record.result)} /></TableCell><TableCell><Button size="small" onClick={() => void open(record)}>{tr('details')}</Button></TableCell>
        </TableRow>)}{records.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }} color="text.secondary">{busy ? tr('loading') : tr('empty')}</TableCell></TableRow>}</TableBody></Table></TableContainer>
      {cursor && <Box sx={{ p: 2, textAlign: 'center' }}><Button disabled={busy} onClick={() => void load(cursor)}>{tr('more')}</Button></Box>}</Card>
    </Stack>
    <Dialog open={!!selected} onClose={close} maxWidth="lg" fullWidth><DialogTitle>{tr('details')}</DialogTitle><DialogContent dividers>
      {selected && <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center"><CommonChip type="status" value={statusValue(selected.result)} label={tr(`results.${selected.result}`, selected.result)} /><Typography variant="body2">{when(selected.time)} · {selected.actor.name || selected.actor.id}</Typography></Stack>
        <Box sx={{ overflowWrap: 'anywhere' }}><Typography variant="body2">{tr('operationId')}: {selected.operationId}</Typography>{selected.sourceId && <Typography variant="body2">{tr('sourceId')}: {selected.sourceId}</Typography>}<Typography variant="body2">{tr('sourceIp')}: {selected.sourceIp || '—'}</Typography><Typography variant="caption" color="text.secondary">{tr('digest')}: {selected.digest}</Typography></Box>
        {selected.native?.impersonatedUser && <Alert severity="info">{tr('impersonated')}: {selected.native.impersonatedUser.id}</Alert>}
        {selected.result === 'dry_run' && <Alert severity="info">{tr('dryRun')}</Alert>}
        {detailBusy ? <CircularProgress size={24} /> : detailError ? <Alert severity="error">{detailError}</Alert> : selected.changes.map((change, i) => <Stack key={i} spacing={1}>
          <Divider /><Typography fontWeight={600}>{change.resource} / {[change.namespace, change.name].filter(Boolean).join('/')}</Typography>
          {change.beforeSource === 'unavailable_response_body' ? <Alert severity="warning">{tr('responseUnavailable')}</Alert> : change.beforeSource === 'unavailable_metadata_only' ? <Alert severity="warning">{tr('metadata')}</Alert> : change.beforeSource === 'request_only' ? <Alert severity="info">{tr('requestOnly')}</Alert> : <>
            {change.beforeSource === 'previous_audit_response' && <Alert severity="info">{tr('previous')}</Alert>}{change.beforeSource === 'api_read' && <Typography variant="caption" color="text.secondary">{tr('apiRead')}</Typography>}{change.beforeSource.startsWith('unavailable') && <Alert severity="info">{tr('unavailable')}</Alert>}
            <Typography variant="body2">{tr('fields')}: {change.fields.join(', ') || tr('noDiff')}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, minWidth: 0 }}><Box sx={{ minWidth: 0 }}><Typography variant="subtitle2" gutterBottom>{tr('before')}</Typography>{code(change.before)}</Box><Box sx={{ minWidth: 0 }}><Typography variant="subtitle2" gutterBottom>{tr('after')}</Typography>{code(change.after)}</Box></Box>
          </>}
        </Stack>)}
        {!detailBusy && !detailError && selected.native?.request != null && <Box><Typography variant="subtitle2" gutterBottom>{tr('request')}</Typography>{code(selected.native.request)}</Box>}
      </Stack>}
    </DialogContent><DialogActions><Button onClick={() => { if (selected) setFilters({ domain: '', actor: '', object: '', result: '', start: '', end: '', operationId: selected.operationId }); close(); }}>{tr('correlated')}</Button><Button onClick={close}>{tr('close')}</Button></DialogActions></Dialog>
  </Box>;
}
