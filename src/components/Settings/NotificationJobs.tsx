import { Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { TFunction } from 'i18next';
import type { NotificationChannel, NotificationJob } from '../../services/api';
import { CommonChip } from '../Common/CommonChip';
interface Props { jobs: NotificationJob[]; channels: NotificationChannel[]; next: string; busy: boolean; onRefresh: () => void; onNext: () => void; onRetry: (job: NotificationJob) => Promise<void>; t: TFunction }
export function NotificationJobs({ jobs, channels, next, busy, onRefresh, onNext, onRetry, t }: Props) {
  return <Box sx={{ mt: 4 }}>
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>{t('notificationPipeline.jobs')}</Typography>
      <Button disabled={busy} size="small" onClick={onRefresh}>{t('notificationPipeline.latest')}</Button>
      {next && <Button disabled={busy} size="small" onClick={onNext}>{t('notificationPipeline.next')}</Button>}
    </Stack>
    {!jobs.length ? <Typography color="text.secondary" variant="body2">{t('notificationPipeline.noJobs')}</Typography> : <TableContainer><Table size="small">
      <TableHead><TableRow>{['time', 'channel', 'title', 'status', 'attempts', 'error'].map((key) => <TableCell key={key}>{t(`notificationPipeline.${key}`)}</TableCell>)}<TableCell /></TableRow></TableHead>
      <TableBody>{jobs.map((job) => <TableRow key={job.id}>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(job.createdAt).toLocaleString()}</TableCell>
        <TableCell>{channels.find((channel) => channel.id === job.channelID)?.name ?? job.channelType}<Typography variant="caption" display="block">{job.recipient}</Typography></TableCell>
        <TableCell>{job.title}</TableCell>
        <TableCell><CommonChip type="status" value={job.status === 'sent' ? 'success' : job.status === 'failed' || job.status === 'unknown' ? 'error' : 'disabled'} label={t(`notificationPipeline.${job.status}`)} /></TableCell>
        <TableCell>{job.attempts}</TableCell><TableCell>{job.error}</TableCell>
        <TableCell>{(job.status === 'failed' || job.status === 'unknown') && <Button size="small" disabled={busy} onClick={() => void onRetry(job)}>{t('notificationPipeline.retry')}</Button>}</TableCell>
      </TableRow>)}</TableBody>
    </Table></TableContainer>}
  </Box>;
}
