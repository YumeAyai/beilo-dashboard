import { Alert, Button, Card, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DataplaneReport } from '../../types/dataplane';
import { ObservationChip } from './Observation';
import { metricValue, observationTime } from './format';

export function XDPPanel({ report }: { report: DataplaneReport }) {
  const { t } = useTranslation();
  const agent = report.components.find(component => component.id === 'xdp');
  return <Stack spacing={2}>
    <Alert severity="info">{t('dataplane.xdpHint')}</Alert>
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography fontWeight={600}>{t('dataplane.xdpMetrics')}</Typography><ObservationChip state={report.xdp.state} />
      </Stack>
      {report.xdp.targets.length === 0 ? <Alert severity="info">{t(`dataplane.metricsHints.${report.xdp.state}`, { defaultValue: t('dataplane.noMetrics') })}</Alert> :
        <TableContainer><Table size="small">
          <TableHead><TableRow>{['target', 'attached', 'passed', 'droppedIP', 'droppedTCP', 'syncErrors', 'lastSync'].map(key => <TableCell key={key}>{t(`dataplane.${key}`)}</TableCell>)}</TableRow></TableHead>
          <TableBody>{report.xdp.targets.map(target => <TableRow key={`${target.job}/${target.instance}/${target.node}`}>
            <TableCell><Typography variant="body2">{target.node || target.instance}</Typography><Typography variant="caption" color="text.secondary">{target.job} {target.node ? target.instance : ''}</Typography></TableCell>
            <TableCell><ObservationChip state={target.attached == null ? 'unknown' : target.attached ? 'attached' : 'detached'} /></TableCell>
            <TableCell>{metricValue(target.passed)}</TableCell><TableCell>{metricValue(target.dropped_ip)}</TableCell>
            <TableCell>{metricValue(target.dropped_tcp)}</TableCell><TableCell>{metricValue(target.sync_errors)}</TableCell>
            <TableCell>{observationTime(target.last_sync)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{t('dataplane.counterHint')}</Typography>
    </Card>
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} sx={{ mb: 1 }}>{t('dataplane.agentDeployments')}</Typography>
      {agent?.agents.map(item => <Stack direction="row" gap={1} key={`${item.namespace}/${item.name}`} sx={{ mb: 1 }}>
        <Typography variant="body2">{item.namespace}/{item.name}</Typography>
        <ObservationChip state={item.observed && item.desired > 0 && item.ready >= item.desired ? 'available' : 'degraded'} />
        <Typography variant="body2">{item.ready}/{item.desired}</Typography>
      </Stack>)}
      {!agent?.agents.length && <Typography color="text.secondary" variant="body2">{t(agent?.state === 'not_installed' ? 'dataplane.noXDPAgent' : 'dataplane.sourceUnavailable')}</Typography>}
      <Button component={Link} to="/blocking" variant="outlined" sx={{ mt: 2 }}>{t('dataplane.manageBlocks')}</Button>
    </Card>
  </Stack>;
}
