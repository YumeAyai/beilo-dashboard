import { RefreshButton } from '../components/Common/RefreshButton';
import { useCallback, useState } from 'react';
import { Alert, Box, Button, Card, CardActionArea, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { AccountTreeOutlined, ArrowForward, DnsOutlined, HubOutlined, MemoryOutlined, StorageOutlined } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clusterApi } from '../services/cluster';
import { useDataplaneResource } from '../hooks/useDataplaneResource';
import { metricValue, observationTime } from '../components/Dataplane/format';
import { ClusterState } from '../components/Cluster/State';
import { IPPools } from '../components/Cluster/IPPools';
import { PageLayout, PageTabs } from '../components/Common/PageLayout';
import { StatCard } from '../components/Common/DashboardCards';

const tabs = ['overview', 'nodes', 'cilium', 'lb', 'xdp'];
const configKeys = ['routing-mode', 'tunnel-protocol', 'kube-proxy-replacement', 'bpf-lb-acceleration', 'enable-l7-proxy', 'enable-l2-announcements', 'enable-bgp-control-plane'];

export function ClusterManagement() {
  const { t } = useTranslation();
  const tr = (key: string, options?: Record<string, unknown>) => t(`clusterManagement.${key}`, options);
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') || 'overview';
  const tab = tabs.includes(requested) ? requested : 'overview';
  const selectTab = (value: string) => { const next = new URLSearchParams(params); next.set('tab', value); setParams(next); };
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [nodeName, setNodeName] = useState<string | null>(null);
  const load = useCallback((signal: AbortSignal) => clusterApi.status(signal), []);
  const remote = useDataplaneResource('cluster:status', load, autoRefresh);
  const report = remote.data;
  const cilium = report?.components.find(component => component.id === 'cilium');
  const xdp = report?.components.find(component => component.id === 'xdp');
  const known = (source: string) => !!report && !report.issues.some(issue => issue.source === source);
  const refresh = () => { void remote.refresh(); setRevision(value => value + 1); };
  const node = report?.nodes.find(item => item.name === nodeName);
  const details = report?.node_details.find(item => item.name === nodeName);
  const cardStyle = { p: 2.5, minWidth: 0 };

  return <PageLayout title={tr('title')} subtitle={tr('subtitle')} icon={<DnsOutlined />} actions={<>
      <FormControlLabel control={<Switch checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} sx={{ color: 'white', mx: 1 }} />} label={t('threat.autoRefresh')} />
      <RefreshButton loading={remote.loading} onClick={refresh} />
    </>}><Stack spacing={2.5}>
    {remote.error && <Alert severity="error">{tr(`error_${remote.error}`, { defaultValue: remote.error })}{report && <Typography variant="body2">{tr('stale')}</Typography>}</Alert>}
    {remote.loading && !report && <LinearProgress aria-label={t('common.loading')} />}
    {report?.issues.map(issue => <Alert key={issue.source} severity="warning">{tr('sourceError', { source: tr(`source_${issue.source}`, { defaultValue: issue.source }) })}</Alert>)}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
      {[
        { key: 'readyNodes', tab: 'nodes', icon: <DnsOutlined />, value: known('nodes') ? `${report!.nodes.filter(item => item.state === 'ready').length} / ${report!.nodes.length}` : '—', hint: 'readyHint' },
        { key: 'ciliumAgents', tab: 'cilium', icon: <HubOutlined />, value: cilium && cilium.state !== 'unknown' && known('agents') ? `${cilium.ready} / ${cilium.desired}` : '—', hint: 'agentHint' },
        { key: 'pools', tab: 'lb', icon: <StorageOutlined />, value: known('lb_pools') ? metricValue(report!.lb.pools.length) : '—', hint: 'poolHint' },
        { key: 'services', tab: 'lb', icon: <AccountTreeOutlined />, value: known('lb_services') ? `${report!.lb.services.filter(service => service.state === 'allocated').length} / ${report!.lb.services.length}` : '—', hint: 'serviceHint' },
      ].map(stat => <StatCard key={stat.key} title={tr(stat.key)} value={stat.value} icon={stat.icon}
        onClick={() => selectTab(stat.tab)} extra={<Typography variant="caption" color="text.secondary">{tr(stat.hint)}</Typography>} />)}
    </Box>
    <PageTabs value={tab} onChange={(_, value: string) => selectTab(value)} aria-label={tr('title')}>
      {tabs.map(name => <Tab key={name} value={name} id={`cluster-tab-${name}`} aria-controls={`cluster-panel-${name}`} label={tr(name)} />)}
    </PageTabs>
    {report && <Box role="tabpanel" id={`cluster-panel-${tab}`} aria-labelledby={`cluster-tab-${tab}`}>
      {tab === 'overview' && <Stack spacing={2.5}>
        <Alert severity="info">{tr('overviewHint')}</Alert>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          {[{ tab: 'nodes', icon: <DnsOutlined />, state: known('nodes') ? report.nodes.some(item => item.state !== 'ready') ? 'degraded' : report.nodes.length ? 'available' : 'empty' : 'unknown' }, { tab: 'cilium', icon: <HubOutlined />, state: cilium?.state || 'unknown' }, { tab: 'lb', icon: <StorageOutlined />, state: report.lb.pools.some(pool => pool.conflict) ? 'conflict' : report.lb.state }, { tab: 'xdp', icon: <MemoryOutlined />, state: xdp?.state || 'unknown' }].map(item => <Card key={item.tab} variant="outlined"><CardActionArea onClick={() => selectTab(item.tab)} sx={cardStyle}>
            <Stack direction="row" alignItems="center" gap={1.5}><Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main', display: 'flex' }}>{item.icon}</Box><Box sx={{ flex: 1 }}><Typography fontWeight={600}>{tr(item.tab)}</Typography><Box sx={{ mt: 1 }}><ClusterState state={item.state} /></Box></Box><ArrowForward color="action" /></Stack>
          </CardActionArea></Card>)}
        </Box>
        <Typography variant="caption" color="text.secondary">{tr('checkedAt')}：{observationTime(report.checked_at)}</Typography>
      </Stack>}
      {tab === 'nodes' && <Card variant="outlined" sx={cardStyle}><Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="space-between"><Typography variant="h6">{tr('nodes')}</Typography><TextField size="small" label={tr('search')} value={search} onChange={event => setSearch(event.target.value)} /></Stack>
        <TableContainer><Table size="small" aria-label={tr('nodes')} sx={{ minWidth: 700 }}><TableHead><TableRow>{['node', 'ip', 'state', 'kernel', 'heartbeat', 'details'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead><TableBody>
          {report.nodes.filter(item => `${item.name} ${item.internal_ip}`.toLowerCase().includes(search.toLowerCase().trim())).map(item => <TableRow key={item.name} hover><TableCell>{item.name}</TableCell><TableCell>{item.internal_ip || '—'}</TableCell><TableCell><ClusterState state={item.state} /></TableCell><TableCell>{item.kernel || '—'}</TableCell><TableCell>{observationTime(item.last_heartbeat)}</TableCell><TableCell><Button size="small" onClick={() => setNodeName(item.name)}>{tr('details')}</Button></TableCell></TableRow>)}
          {known('nodes') && !report.nodes.filter(item => `${item.name} ${item.internal_ip}`.toLowerCase().includes(search.toLowerCase().trim())).length && <TableRow><TableCell colSpan={6}>{tr('noNodes')}</TableCell></TableRow>}
        </TableBody></Table></TableContainer>
      </Stack></Card>}
      {tab === 'cilium' && <Stack spacing={2.5}>
        <Card variant="outlined" sx={cardStyle}><Stack spacing={2}><Typography variant="h6">{tr('workloads')}</Typography><ClusterState state={report.network.workload_state} />
          <TableContainer><Table size="small" aria-label={tr('workloads')}><TableHead><TableRow>{['service', 'kind', 'readiness', 'state', 'images'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead><TableBody>{report.network.workloads.map(workload => <TableRow key={`${workload.kind}/${workload.name}`}><TableCell>{workload.namespace}/{workload.name}</TableCell><TableCell>{workload.kind}</TableCell><TableCell>{workload.ready} / {workload.desired}</TableCell><TableCell><ClusterState state={!workload.observed || workload.ready < workload.desired ? 'degraded' : workload.desired ? 'available' : 'inactive'} /></TableCell><TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 400 }}>{workload.images.map(image => <Typography key={image} variant="caption" display="block">{image}</Typography>)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
          {!report.network.workloads.length && <Typography color="text.secondary">{tr('noWorkloads')}</Typography>}
        </Stack></Card>
        <Card variant="outlined" sx={cardStyle}><Stack spacing={2}><Stack direction="row" alignItems="center" gap={2}><Typography variant="h6">{tr('desiredConfig')}</Typography><ClusterState state={report.network.config_state} /></Stack><Alert severity="info">{tr('configHint')}</Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>{configKeys.map(key => <Box key={key} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}><Typography variant="body2" color="text.secondary">{tr(key)}</Typography><Typography sx={{ mt: 0.75, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{report.network.config[key] || tr('state_unknown')}</Typography></Box>)}</Box>
        </Stack></Card>
      </Stack>}
      {tab === 'lb' && <IPPools report={report} autoRefresh={autoRefresh} revision={revision} onChanged={() => { void remote.refresh(); }} />}
      {tab === 'xdp' && <Stack spacing={2.5}>
        <Alert severity="info">{tr('xdpHint')}</Alert>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          <Card variant="outlined" sx={cardStyle}><Stack spacing={1.5}><Typography variant="h6">{tr('nativeXDP')}</Typography><Typography variant="h5">{report.network.config['bpf-lb-acceleration'] || tr('state_unknown')}</Typography><Typography variant="body2" color="text.secondary">{tr('nativeHint')}</Typography></Stack></Card>
          <Card variant="outlined" sx={cardStyle}><Stack spacing={1.5}><Typography variant="h6">{tr('beiloXDP')}</Typography><ClusterState state={xdp?.state || 'unknown'} />{xdp?.agents.map(agent => <Typography key={`${agent.namespace}/${agent.name}`} variant="body2">{agent.namespace}/{agent.name} · {agent.ready} / {agent.desired}</Typography>)}</Stack></Card>
        </Box>
        <Card variant="outlined" sx={cardStyle}><Stack spacing={2}><Stack direction="row" gap={2} alignItems="center"><Typography variant="h6">{tr('source_xdp_metrics')}</Typography><ClusterState state={report.xdp.state} /></Stack><Typography variant="caption" color="text.secondary">{tr('countersHint')}</Typography>
          {!report.xdp.targets.length ? <Typography color="text.secondary">{tr('noMetrics')}</Typography> : <TableContainer><Table size="small" sx={{ minWidth: 850 }}><TableHead><TableRow>{['target', 'attached', 'passed', 'droppedIP', 'droppedTCP', 'syncErrors', 'lastSync'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead><TableBody>{report.xdp.targets.map(target => <TableRow key={`${target.job}/${target.instance}/${target.node}`}><TableCell>{target.node || target.instance}<Typography variant="caption" display="block">{target.job} · {target.instance}</Typography></TableCell><TableCell><ClusterState state={target.attached == null ? 'unknown' : target.attached ? 'attached' : 'detached'} /></TableCell><TableCell>{metricValue(target.passed)}</TableCell><TableCell>{metricValue(target.dropped_ip)}</TableCell><TableCell>{metricValue(target.dropped_tcp)}</TableCell><TableCell>{metricValue(target.sync_errors)}</TableCell><TableCell>{observationTime(target.last_sync)}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
        </Stack></Card>
      </Stack>}
    </Box>}
  </Stack>
    <Dialog open={!!nodeName} onClose={() => setNodeName(null)} maxWidth="sm" fullWidth><DialogTitle>{nodeName}</DialogTitle><DialogContent><Stack spacing={2}>
      <ClusterState state={node?.state || 'unknown'} />
      <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 1.5, m: 0 }}>{[['ip', node?.internal_ip], ['kernel', node?.kernel], ['os', details?.os], ['architecture', details?.architecture], ['kubelet', details?.kubelet], ['schedulable', details ? tr(details.unschedulable ? 'cordoned' : 'scheduling') : undefined]].map(([key, value]) => <Box key={key} sx={{ display: 'contents' }}><Typography component="dt" variant="body2" color="text.secondary">{tr(key!)}</Typography><Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value || '—'}</Typography></Box>)}</Box>
      <Typography fontWeight={600}>{tr('allocatable')}</Typography><Stack direction="row" gap={1} flexWrap="wrap">{['cpu', 'memory', 'pods'].map(key => <Chip key={key} variant="outlined" label={`${key}: ${details?.allocatable[key] || '—'}`} />)}</Stack>
      {['MemoryPressure', 'DiskPressure', 'PIDPressure'].map(key => <Stack key={key} direction="row" justifyContent="space-between" gap={1}><Typography variant="body2">{tr(key)}</Typography><Chip size="small" color={details?.conditions[key] === 'True' ? 'warning' : 'default'} label={details?.conditions[key] === 'False' ? tr('normal') : details?.conditions[key] === 'True' ? tr('pressure') : tr('state_unknown')} /></Stack>)}
    </Stack></DialogContent><DialogActions><Button onClick={() => setNodeName(null)}>{t('common.close')}</Button></DialogActions></Dialog>
  </PageLayout>;
}
