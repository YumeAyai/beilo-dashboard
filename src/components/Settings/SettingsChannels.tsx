import {
  Box, Typography, Button, IconButton,
  CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Notifications as ChannelIcon } from '@mui/icons-material';
import type { NotificationChannel } from '../../services/api';
import { colors } from '../../theme/colors';
import { CommonChip } from '../Common/CommonChip';
import type { TFunction } from 'i18next';
import { notificationChannelLabel } from './notificationChannelTypes';

interface SettingsChannelsProps {
  t: TFunction;
  onTestChannel: (id: string) => void;
  testingChannel: string;
  onOpenChannelDialog: (channel?: NotificationChannel) => void;
  channels: NotificationChannel[];
  loadingChannels: boolean;
  channelError: string;
  onDeleteChannel: (id: string) => void;
}

export function SettingsChannels({
  t,
  onTestChannel,
  testingChannel,
  channels,
  loadingChannels,
  channelError,
  onDeleteChannel,
  onOpenChannelDialog,
}: SettingsChannelsProps) {
  const getTypeLabel = (type: string): string => {
    return t(notificationChannelLabel(type), { defaultValue: type.toUpperCase() });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <ChannelIcon sx={{ color: colors.primary.main }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('settings.channels.title') || '通知渠道'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.channels.subtitle') || '管理通知渠道和规则'}
          </Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => onOpenChannelDialog()}>
          {t('settings.channels.addChannel') || '添加渠道'}
        </Button>
      </Box>

      {channelError && <Alert severity="error" sx={{ mb: 2 }}>{channelError}</Alert>}

      {loadingChannels ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : channels.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <ChannelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {t('settings.channels.noChannels') || '暂无通知渠道'}
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small" aria-label={t('settings.channels.title')} sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('settings.channels.type')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('settings.channels.default')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell component="th" scope="row">
                    <Typography variant="subtitle2" fontWeight="bold" noWrap title={channel.name} sx={{ maxWidth: 240 }}>
                      {channel.name}
                    </Typography>
                  </TableCell>
                  <TableCell><CommonChip type="status" value="unknown" label={getTypeLabel(channel.type)} /></TableCell>
                  <TableCell><CommonChip type="status" value={channel.isActive ? 'active' : 'disabled'} /></TableCell>
                  <TableCell>{channel.isDefault ? <CommonChip type="status" value="unknown" label={t('settings.channels.default') || 'Default'} /> : '—'}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                      <Button size="small" disabled={!channel.isActive || Boolean(testingChannel)} onClick={() => onTestChannel(channel.id)}>{t(testingChannel === channel.id ? 'notificationPipeline.testing' : 'notificationPipeline.test')}</Button>
                      <IconButton size="small" onClick={() => onOpenChannelDialog(channel)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDeleteChannel(channel.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
