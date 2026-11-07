import { Box, Button, Card, CardActionArea, CardContent, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Hub, Memory, Terminal, ArrowForward } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DataplaneReport } from '../../types/dataplane';
import { ObservationChip } from './Observation';
import { observationTime } from './format';

const componentIcons = { cilium: <Hub />, xdp: <Memory />, tetragon: <Terminal /> };

export function DataplaneOverview({ report, selectTab }: { report: DataplaneReport; selectTab: (tab: string) => void }) {
  const { t } = useTranslation();
  return <Stack spacing={2.5}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
      {report.components.map(component => <Card key={component.id} variant="outlined">
        <CardActionArea onClick={() => selectTab(component.id === 'tetragon' ? 'runtime' : component.id === 'xdp' ? 'xdp' : 'overview')}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, color: 'primary.main' }}>
              {componentIcons[component.id]}<Typography fontWeight={600}>{t(`dataplane.components.${component.id}`)}</Typography>
            </Stack>
            <ObservationChip state={component.state} />
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              {component.state === 'unknown' ? '—' : t('dataplane.readyAgents', { ready: component.ready, desired: component.desired })}
            </Typography>
            <Typography variant="caption" color="text.secondary">{t('dataplane.componentScope')}</Typography>
          </CardContent>
        </CardActionArea>
      </Card>)}
    </Box>
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography fontWeight={600}>{t('dataplane.nodes')}</Typography>
        <Button component={Link} to="/topology" size="small" endIcon={<ArrowForward />}>{t('layout.nav.topology')}</Button>
      </Stack>
      <TableContainer><Table size="small">
        <TableHead><TableRow>{['node', 'internalIP', 'kernel', 'state', 'heartbeat'].map(key => <TableCell key={key}>{t(`dataplane.${key}`)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{report.nodes.map(node => <TableRow key={node.name}>
          <TableCell>{node.name}</TableCell><TableCell>{node.internal_ip || '—'}</TableCell>
          <TableCell>{node.kernel || '—'}</TableCell><TableCell><ObservationChip state={node.state} /></TableCell>
          <TableCell>{observationTime(node.last_heartbeat)}</TableCell>
        </TableRow>)}{report.nodes.length === 0 && <TableRow><TableCell colSpan={5}>{t('dataplane.noNodes')}</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <Typography variant="caption" color="text.secondary">{t('dataplane.heartbeatHint')}</Typography>
    </Card>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
      <Button variant="outlined" component={Link} to="/blocking">{t('dataplane.manageBlocks')}</Button>
      <Button variant="outlined" onClick={() => selectTab('lb')}>{t('dataplane.lb')}</Button>
      <Button variant="outlined" onClick={() => selectTab('runtime')}>{t('dataplane.runtime')}</Button>
    </Stack>
  </Stack>;
}
