import { Alert, Card, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DataplaneReport } from '../../types/dataplane';
import { ObservationChip } from './Observation';
import { metricValue } from './format';

export function LBPanel({ report }: { report: DataplaneReport }) {
  const { t } = useTranslation();
  return <Stack spacing={2}>
    <Alert severity="info">{t('dataplane.lbHint')}</Alert>
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography fontWeight={600}>{t('dataplane.pools')}</Typography><ObservationChip state={report.lb.state} />
      </Stack>
      <TableContainer><Table size="small">
        <TableHead><TableRow>{['pool', 'addresses', 'total', 'used', 'available', 'state'].map(key => <TableCell key={key}>{t(`dataplane.${key}`)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{report.lb.pools.map(pool => <TableRow key={pool.name}>
          <TableCell>{pool.name}</TableCell><TableCell>{pool.blocks.join(', ') || '—'}</TableCell>
          <TableCell>{metricValue(pool.total)}</TableCell><TableCell>{metricValue(pool.used)}</TableCell><TableCell>{metricValue(pool.available)}</TableCell>
          <TableCell><ObservationChip state={pool.conflict ? 'conflict' : pool.disabled ? 'inactive' : 'configured'} /></TableCell>
        </TableRow>)}{report.lb.pools.length === 0 && <TableRow><TableCell colSpan={6}>{t('dataplane.noPools')}</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
    </Card>
    <Card variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={600} sx={{ mb: 1 }}>{t('dataplane.vipServices')}</Typography>
      <TableContainer><Table size="small">
        <TableHead><TableRow>{['service', 'namespace', 'vip', 'ports', 'allocation', 'reachability'].map(key => <TableCell key={key}>{t(`dataplane.${key}`)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{report.lb.services.map(service => <TableRow key={`${service.namespace}/${service.name}`}>
          <TableCell>{service.name}</TableCell><TableCell>{service.namespace}</TableCell>
          <TableCell>{service.addresses.join(', ') || '—'}</TableCell><TableCell>{service.ports.join(', ') || '—'}</TableCell>
          <TableCell><ObservationChip state={service.state} />{service.reason && <Typography variant="caption" display="block">{service.message || service.reason}</Typography>}</TableCell><TableCell><ObservationChip state="unknown" /></TableCell>
        </TableRow>)}{report.lb.services.length === 0 && <TableRow><TableCell colSpan={6}>{t('dataplane.noServices')}</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
    </Card>
  </Stack>;
}
