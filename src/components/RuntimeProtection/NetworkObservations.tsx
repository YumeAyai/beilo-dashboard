import { useCallback, useState } from 'react';
import { Alert, Box, Button, Card, Chip, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../../services/dataplane';
import { useDataplaneResource } from '../../hooks/useDataplaneResource';
import { observationTime } from '../Dataplane/format';
import type { NetworkObservation } from '../../types/dataplane';

const protocols = ['TCP', 'UDP', 'ICMPv4', 'ICMPv6', 'SCTP', 'OTHER_IP', 'L2'];
export function NetworkObservations({ autoRefresh }: { autoRefresh: boolean }) {
 const { t } = useTranslation();
 const tr = (key: string) => t(`runtimeNetwork.${key}`);
 const [protocol, setProtocol] = useState('');
 const [namespace, setNamespace] = useState('');
 const load = useCallback((signal: AbortSignal) => dataplaneApi.network(namespace, protocol, signal), [namespace, protocol]);
 const remote = useDataplaneResource(`runtime-network:${namespace}:${protocol}`, load, autoRefresh);
 const data = remote.data;
 const namespaces = [...new Set([namespace, ...(data?.context_coverage?.namespaces.map(n => n.namespace) || []), ...(data?.events.flatMap(e => [e.source_namespace || '', e.destination_namespace || '']) || [])])].filter(Boolean).sort();
 const endpoint = (e: NetworkObservation, side: 'source' | 'destination') => {
  const ip = e[`${side}_ip`]; const port = e[`${side}_port`]; const ns = e[`${side}_namespace`]; const pod = e[`${side}_pod`];
  return <><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{ip ? `${ip.includes(':') ? `[${ip}]` : ip}${port ? `:${port}` : ''}` : '—'}</Typography>{(ns || pod) && <Typography variant="caption" color="text.secondary">{ns}/{pod}</Typography>}</>;
 };
 return <Stack spacing={2}>
  <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={2}>
   <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between"><Box><Typography fontWeight={600}>{tr('title')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{tr('hint')}</Typography></Box><Button variant="outlined" onClick={() => void remote.refresh()} disabled={remote.loading} sx={{ flexShrink: 0, alignSelf: 'start' }}>{tr('refresh')}</Button></Stack>
   {remote.error && <Alert severity="error">{tr('loadError')} {remote.error}</Alert>}
   {remote.loading && <LinearProgress />}
   {data && <>
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap"><Chip size="small" label={`${tr('state')}: ${tr(data.state)}`} color={data.state === 'available' ? 'success' : ['degraded', 'reconnecting'].includes(data.state) ? 'warning' : 'default'} /><Typography variant="body2">{tr('samples')}: {data.samples}</Typography><Typography variant="body2">{tr('nodes')}: {data.nodes_connected === undefined ? '—' : `${data.nodes_connected} / ${data.total_nodes}`}</Typography><Typography variant="body2">{tr('gaps')}: {data.stream_gaps}</Typography></Stack>
    {['degraded', 'reconnecting'].includes(data.state) && <Alert severity="warning">{tr('incomplete')}</Alert>}
    <Typography variant="caption" color="text.secondary">{tr('truncated')}</Typography>
   </>}
   <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
    <TextField select size="small" label={tr('namespace')} value={namespace} onChange={e => setNamespace(e.target.value)} sx={{ minWidth: 220 }}><MenuItem value="">{tr('allNamespaces')}</MenuItem>{namespaces.map(ns => <MenuItem key={ns} value={ns}>{ns}</MenuItem>)}</TextField>
    <TextField select size="small" label={tr('protocol')} value={protocol} onChange={e => setProtocol(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">{tr('allProtocols')}</MenuItem>{protocols.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField>
   </Stack>
   {data && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{protocols.map(p => <Chip key={p} size="small" variant={protocol === p ? 'filled' : 'outlined'} label={`${p}: ${data.protocols[p] || 0}`} onClick={() => setProtocol(protocol === p ? '' : p)} />)}</Stack>}
   {data && !data.events.length && <Alert severity="info">{tr('empty')}</Alert>}
   {!!data?.events.length && <TableContainer><Table size="small" aria-label={tr('title')} sx={{ minWidth: 800 }}><TableHead><TableRow>{['time', 'protocol', 'source', 'destination', 'verdict', 'cookie'].map(key => <TableCell key={key}>{tr(key)}</TableCell>)}</TableRow></TableHead><TableBody>{data.events.map(e => <TableRow key={`${e.node}/${e.id}`} hover><TableCell sx={{ whiteSpace: 'nowrap' }}>{observationTime(e.time)}</TableCell><TableCell>{e.protocol}{e.icmp_type !== undefined && <Typography variant="caption" display="block">{e.icmp_type}/{e.icmp_code}</Typography>}</TableCell><TableCell>{endpoint(e, 'source')}</TableCell><TableCell>{endpoint(e, 'destination')}</TableCell><TableCell>{e.verdict}</TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{e.socket_cookie || '—'}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
   <Typography variant="caption" color="text.secondary">{tr('behaviorHint')}</Typography>
  </Stack></Card>
  <Card variant="outlined" sx={{ p: 2.5 }}><Stack spacing={1.5}><Typography fontWeight={600}>{tr('coverage')}</Typography><Typography variant="body2" color="text.secondary">{tr('coverageHint')}</Typography>{!data?.context_coverage?.enabled && <Typography variant="body2">{tr('unconfigured')}</Typography>}<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{data?.context_coverage?.namespaces.map(ns => <Chip key={ns.namespace} variant="outlined" size="small" label={`${ns.namespace}: ${tr(ns.state)}`} color={['error', 'conflict'].includes(ns.state) ? 'warning' : 'default'} />)}</Stack></Stack></Card>
 </Stack>;
}
