import { RefreshButton } from '../components/Common/RefreshButton';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, MenuItem, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Security, ShieldOutlined, ViewListOutlined, GppMaybeOutlined, AccountTreeOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../services/dataplane';
import { useDataplaneResource } from '../hooks/useDataplaneResource';
import { NetworkObservations } from '../components/RuntimeProtection/NetworkObservations';
import { RuntimePolicyLibrary } from '../components/RuntimeProtection/PolicyLibrary/RuntimePolicyLibrary';
import { RuntimePolicies } from '../components/Dataplane/RuntimePolicies';
import { observationTime } from '../components/Dataplane/format';
import { groupRuntimeEvents, type GroupedRuntimeEvent } from '../components/Dataplane/runtimeHelpers';
import { isEnforcementReport, runtimeAction, runtimeWorkloads, type RuntimeAction } from '../components/RuntimeProtection/model';
import { PageLayout, PageTabs } from '../components/Common/PageLayout';
import { StatCard } from '../components/Common/DashboardCards';

const actionNames: RuntimeAction[] = ['override', 'sigkill', 'signal', 'post', 'other'];
const stateKeys: Record<string, string> = { not_installed: 'notInstalled', empty: 'emptyState' };

export function RuntimeProtection() {
  const { t } = useTranslation();
  const tr = (key: string, options?: Record<string, unknown>) => t(`runtimeProtection.${key}`, options);
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') === 'library' ? 'library' : 'activity');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [duration, setDuration] = useState('1h');
  const [search, setSearch] = useState('');
  const [namespace, setNamespace] = useState('');
  const [action, setAction] = useState('all');
  const [selected, setSelected] = useState<GroupedRuntimeEvent | null>(null);
  const loadStatus = useCallback((signal: AbortSignal) => dataplaneApi.status(signal), []);
  const loadEvents = useCallback((signal: AbortSignal) => dataplaneApi.events(duration, signal), [duration]);
  const loadMonitor = useCallback((signal: AbortSignal) => dataplaneApi.monitor(signal), []);
  const status = useDataplaneResource('runtime-protection:status', loadStatus, autoRefresh);
  const events = useDataplaneResource(`runtime-protection:events:${duration}`, loadEvents, autoRefresh);
  const monitor = useDataplaneResource('runtime-protection:monitor', loadMonitor, autoRefresh);
  const tetragon = status.data?.components.find(component => component.id === 'tetragon');
  const state = tetragon?.state || 'unknown';
  const agentsUnavailable = status.data?.issues.some(issue => issue.source === 'agents');
  const namespaces = [...new Set((events.data?.events || []).map(event => event.namespace).filter((value): value is string => !!value))].sort();
  const scoped = useMemo(() => (events.data?.events || []).filter(event =>
    (!namespace || event.namespace === namespace) &&
    [event.namespace, event.pod, event.node, event.container, event.policy, event.function, event.action, event.executable, event.file, event.type, event.pid?.toString(), event.exec_id, event.correlation?.request_id, event.correlation?.datagram_id, event.correlation?.source_ip]
      .some(value => value?.toLowerCase().includes(search.trim().toLowerCase()))
  ), [events.data, namespace, search]);
  const filtered = scoped.filter(event => action === 'all' || (action === 'enforcement' ? isEnforcementReport(event) : runtimeAction(event.action) === action));
  const groups = groupRuntimeEvents(filtered);
  const workloads = runtimeWorkloads(filtered);
  const distribution = actionNames.map(name => ({ name, count: filtered.filter(event => runtimeAction(event.action) === name).length }));
  const findings = (monitor.data?.enabled ? monitor.data.findings : [])?.filter(finding => finding.layer === 'runtime') || [];
  const runtimeSource = monitor.data?.sources.find(source => source.source === 'runtime');
  const stateLabel = (value: string) => tr(stateKeys[value] || value, { defaultValue: tr('unknown') });
  const color = (value: string) => value === 'available' ? 'success' as const : ['degraded', 'unavailable'].includes(value) ? 'error' as const : 'default' as const;
  const number = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString();
  const refresh = () => { void status.refresh(); void events.refresh(); void monitor.refresh(); };

  return <PageLayout title={tr('title')} subtitle={tr('subtitle')} icon={<Security />}
    badge={<Chip label="Tetragon" size="small" variant="outlined" />} actions={<>
        <FormControlLabel control={<Switch checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} sx={{ color: 'white', mx: 1 }} />} label={t('threat.autoRefresh')} />
        <RefreshButton loading={status.loading || events.loading || monitor.loading} onClick={refresh} />
      </>}>
    <Stack spacing={2.5}>
      {[{ remote: status, source: 'statusSource' }, { remote: events, source: 'eventsSource' }, { remote: monitor, source: 'monitorSource' }].map(({ remote, source }) => remote.error && <Alert key={source} severity="error">
        {tr('loadError', { source: tr(source), error: remote.error })}
        {remote.data && <Typography variant="body2">{tr('stale', { source: tr(source) })}</Typography>}
      </Alert>)}
      {agentsUnavailable && <Alert severity="warning">{tr('loadError', { source: tr('statusSource'), error: tr('unavailable') })}</Alert>}
      {tetragon?.state === 'not_installed' && <Alert severity="warning">{tr('noTetragon')}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[
          { key: 'agents', hint: 'agentsHint', icon: <ShieldOutlined />, value: tetragon && state !== 'unknown' && !agentsUnavailable ? `${tetragon.ready} / ${tetragon.desired}` : '—' },
          { key: 'samples', hint: 'samplesHint', icon: <ViewListOutlined />, value: number(events.data ? filtered.length : undefined) },
          { key: 'enforcement', hint: 'enforcementHint', icon: <GppMaybeOutlined />, value: number(events.data ? filtered.filter(isEnforcementReport).length : undefined) },
          { key: 'workloads', hint: 'workloadsHint', icon: <AccountTreeOutlined />, value: number(events.data ? workloads.length : undefined) },
        ].map(stat => <StatCard key={stat.key} title={tr(stat.key)} value={stat.value} icon={stat.icon}
          variant={stat.key === 'enforcement' ? 'warning' : 'info'} extra={<Typography variant="caption" color="text.secondary">{tr(stat.hint)}</Typography>} />)}
      </Box>
      <PageTabs aria-label={tr('title')} value={tab} onChange={(_, value: string) => setTab(value)}>
        {['activity', 'network', 'findings', 'policies', 'library'].map(name => <Tab key={name} value={name} id={`runtime-tab-${name}`} aria-controls={`runtime-panel-${name}`} label={name === 'library' ? t('runtimeLibrary.title') : name === 'network' ? t('runtimeNetwork.title') : tr(name)} />)}
      </PageTabs>
      <Box role="tabpanel" id={`runtime-panel-${tab}`} aria-labelledby={`runtime-tab-${tab}`}>
        {tab === 'activity' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', xl: 'minmax(0, 1fr) 300px' }, gap: 2.5, alignItems: 'start' }}>
          <Card variant="outlined" sx={{ p: 2.5, minWidth: 0 }}><Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <TextField label={tr('search')} size="small" value={search} onChange={event => setSearch(event.target.value)} sx={{ flex: 1 }} />
              <TextField select label={tr('window')} size="small" value={duration} onChange={event => { setDuration(event.target.value); setSelected(null); }} sx={{ minWidth: 140 }}>
                {['15m', '1h', '6h', '24h'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <TextField select label={tr('namespace')} size="small" value={namespace} onChange={event => setNamespace(event.target.value)} sx={{ flex: 1 }}>
                <MenuItem value="">{tr('allNamespaces')}</MenuItem>{[...new Set([...namespaces, ...(namespace ? [namespace] : [])])].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </TextField>
              <TextField select label={tr('action')} size="small" value={action} onChange={event => setAction(event.target.value)} sx={{ flex: 1 }}>
                <MenuItem value="all">{tr('allActions')}</MenuItem><MenuItem value="enforcement">{tr('enforcementOnly')}</MenuItem>
                {actionNames.map(value => <MenuItem key={value} value={value}>{tr(value)}</MenuItem>)}
              </TextField>
            </Stack>
            <Typography variant="caption" color="text.secondary">{tr('sampleHint')}</Typography>
            {events.loading && <LinearProgress aria-label={t('common.loading')} />}
            {events.data?.possibly_truncated && <Alert severity="warning">{tr('truncated')}</Alert>}
            {events.data && <Typography variant="caption" color="text.secondary">{tr('sampleInfo', { count: filtered.length, groups: groups.length, skipped: events.data.skipped })}</Typography>}
            {!events.loading && !events.error && !groups.length && <Alert severity="info">{tr('empty')}</Alert>}
            {!!groups.length && <TableContainer><Table size="small" aria-label={tr('activity')} sx={{ minWidth: 720 }}>
              <TableHead><TableRow>{['time', 'workload', 'policy', 'action', 'count', 'details'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}<TableCell>{t('runtimeAttribution.source')}</TableCell></TableRow></TableHead>
              <TableBody>{groups.map((event, index) => <TableRow key={index} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{observationTime(event.time)}</TableCell>
                <TableCell sx={{ maxWidth: 230, overflowWrap: 'anywhere' }}>{event.namespace || '—'}/{event.pod || '—'}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{event.executable || '—'}</Typography>{event.file && <Typography variant="caption" sx={{ display: 'block' }}>{event.file}</Typography>}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflowWrap: 'anywhere' }}>{event.policy || '—'}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{event.function || event.type}</Typography></TableCell>
                <TableCell><Chip size="small" color={isEnforcementReport(event) ? 'warning' : 'default'} label={tr(runtimeAction(event.action))} /></TableCell>
                <TableCell>{event.count}</TableCell><TableCell><Button size="small" onClick={() => setSelected(event)}>{tr('details')}</Button></TableCell>
                <TableCell sx={{ maxWidth: 230, overflowWrap: 'anywhere' }}>{event.correlation?.source_ip || '—'}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t(`runtimeAttribution.${event.correlation?.state || 'unavailable'}`)}</Typography></TableCell>
              </TableRow>)}</TableBody>
            </Table></TableContainer>}
          </Stack></Card>
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={1.5}>
              <Typography fontWeight={600}>{tr('agentTitle')}</Typography><Chip sx={{ alignSelf: 'start' }} size="small" color={color(state)} label={stateLabel(state)} />
              {tetragon?.agents.map(agent => <Box key={`${agent.namespace}/${agent.name}`}><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{agent.namespace}/{agent.name}</Typography><Typography variant="caption" color="text.secondary">{agent.ready} / {agent.desired}</Typography></Box>)}
              {!tetragon?.agents.length && <Typography variant="body2" color="text.secondary">{tr('noAgents')}</Typography>}
              <Typography variant="caption" color="text.secondary">{tr('statusHint')}</Typography>
              <Typography variant="caption" color="text.secondary">{tr('checkedAt')}：{observationTime(status.data?.checked_at)}</Typography>
              <Button variant="outlined" size="small" onClick={() => setTab('policies')}>{tr('managePolicies')}</Button>
            </Stack></Card>
            <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={1.5}>
              <Typography fontWeight={600}>{tr('distribution')}</Typography>
              {filtered.length ? distribution.filter(item => item.count).map(item => <Box key={item.name}>
                <Button size="small" onClick={() => setAction(action === item.name ? 'all' : item.name)} aria-pressed={action === item.name} sx={{ width: '100%', justifyContent: 'space-between', px: 0, textAlign: 'start' }}>{tr(item.name)}<Box component="span" sx={{ ml: 1 }}>{item.count}</Box></Button>
                <LinearProgress variant="determinate" value={item.count / filtered.length * 100} color={['override', 'sigkill', 'signal'].includes(item.name) ? 'warning' : 'primary'} sx={{ borderRadius: 1 }} />
              </Box>) : <Typography variant="body2" color="text.secondary">{tr('noSamples')}</Typography>}
              <Typography variant="caption" color="text.secondary">{tr('sampleScope')}</Typography>
            </Stack></Card>
            <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={1.5}>
              <Typography fontWeight={600}>{tr('topWorkloads')}</Typography>
              {workloads.slice(0, 5).map(([name, count]) => <Box key={name}>
                <Stack direction="row" gap={1} justifyContent="space-between"><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>{name}</Typography><Typography variant="caption">{count}</Typography></Stack>
                <LinearProgress variant="determinate" value={count / (workloads[0]?.[1] || 1) * 100} sx={{ mt: 0.5, borderRadius: 1 }} />
              </Box>)}
              {!workloads.length && <Typography variant="body2" color="text.secondary">{tr('noWorkloads')}</Typography>}
            </Stack></Card>
          </Stack>
        </Box>}
        {tab === 'network' && <NetworkObservations autoRefresh={autoRefresh} />}
        {tab === 'findings' && <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={2}>
          <Alert severity="info">{monitor.data?.mode === 'observe_and_auto_block' ? t('runtimeAttribution.autoHint') : tr('findingHint')}</Alert>
          {monitor.loading && <LinearProgress aria-label={t('common.loading')} />}
          {monitor.data && !monitor.data.enabled && <Alert severity="info">{tr('monitorDisabled')}</Alert>}
          {monitor.data?.enabled && <>
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap"><Typography variant="body2">{tr('monitorStatus')}</Typography><Chip size="small" color={color(runtimeSource?.state || 'unknown')} label={stateLabel(runtimeSource?.state || 'unknown')} /><Typography variant="caption" color="text.secondary">{tr('checkedAt')}：{observationTime(runtimeSource?.checked_at || monitor.data.checked_at)}</Typography></Stack>
            {!runtimeSource && <Alert severity="warning">{tr('monitorMissing')}</Alert>}
            {runtimeSource && (runtimeSource.truncated || runtimeSource.skipped > 0 || ['degraded', 'unavailable'].includes(runtimeSource.state)) && <Alert severity="warning">{tr('monitorIncomplete')}</Alert>}
            {!findings.length && <Alert severity="info">{tr('noFindings')}</Alert>}
            {!!findings.length && <TableContainer><Table size="small" aria-label={tr('findings')} sx={{ minWidth: 900 }}>
              <TableHead><TableRow>{['time', 'rule', 'workload', 'object', 'evidence', 'action', 'count'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead>
              <TableBody>{[...findings].sort((a, b) => b.last_seen.localeCompare(a.last_seen)).map(finding => <TableRow key={finding.id}>
                <TableCell>{observationTime(finding.last_seen)}</TableCell>
                <TableCell>{finding.rule}<Chip size="small" sx={{ ml: 1 }} color={['high', 'critical'].includes(finding.severity) ? 'error' : 'warning'} label={tr(finding.severity, { defaultValue: finding.severity })} /><Typography variant="caption" sx={{ display: 'block' }}>{tr(finding.description, { defaultValue: finding.description })}</Typography></TableCell>
                <TableCell>{finding.namespace}/{finding.pod || finding.profile}<Typography variant="caption" sx={{ display: 'block' }}>{finding.container}</Typography></TableCell>
                <TableCell sx={{ maxWidth: 240, overflowWrap: 'anywhere' }}>{finding.object || finding.executable || '—'}<Typography variant="caption" sx={{ display: 'block' }}>{finding.origin}</Typography></TableCell>
                <TableCell>{tr(finding.evidence, { defaultValue: finding.evidence })}</TableCell>
                <TableCell>{finding.reported_action || '—'}</TableCell><TableCell>{finding.samples}</TableCell>
              </TableRow>)}</TableBody>
            </Table></TableContainer>}
          </>}
        </Stack></Card>}
        {tab === 'library' && <RuntimePolicyLibrary />}
        {tab === 'policies' && <Stack spacing={2}><Alert severity="info">{tr('policyHint')}</Alert><RuntimePolicies autoRefresh={autoRefresh} /></Stack>}
      </Box>
    </Stack>
    <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm" aria-labelledby="runtime-event-detail-title">
      <DialogTitle id="runtime-event-detail-title">{tr('details')}</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <Alert severity="info">{tr('sampleHint')}</Alert>
        {selected && <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 1.5 }}>
          {([
            ['firstSeen', observationTime(selected.first_time)], ['lastSeen', observationTime(selected.time)], ['count', String(selected.count)],
            ['workload', `${selected.namespace || '—'}/${selected.pod || '—'}`], ['container', selected.container], ['node', selected.node],
            ['policy', selected.policy], ['hook', selected.function], ['type', selected.type], ['rawAction', selected.action],
            ['executable', selected.executable], ['file', selected.file], ['PID', selected.pid?.toString()],
          ] as [string, string | undefined][]).map(([key, value]) => <Box key={key} sx={{ display: 'contents' }}><Typography component="dt" variant="body2" color="text.secondary">{key === 'PID' ? key : tr(key)}</Typography><Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value || '—'}</Typography></Box>)}
          {([
            ['source', selected.correlation?.source_ip], ['protocol', selected.correlation?.protocol], ['connectionId', selected.correlation?.connection_id], ['requestId', selected.correlation?.request_id], ['datagramId', selected.correlation?.datagram_id],
            ['socketInode', selected.correlation?.socket?.inode],
            ['socketCookie', selected.correlation?.socket?.cookie], ['networkNamespace', selected.correlation?.socket?.netns],
            ['executionId', selected.exec_id], ['threadId', selected.tid?.toString()],
          ] as [string, string | undefined][]).map(([key, value]) => <Box key={key} sx={{ display: 'contents' }}><Typography component="dt" variant="body2" color="text.secondary">{t(`runtimeAttribution.${key}`)}</Typography><Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value || '—'}</Typography></Box>)}
        </Box>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setSelected(null)}>{tr('close')}</Button></DialogActions>
    </Dialog>
  </PageLayout>;
}
