import { useState } from 'react';
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Grid, Switch, FormControlLabel } from '@mui/material';
import type { NotificationChannel } from '../../services/api';
import type { TFunction } from 'i18next';
import { SettingsChannelFields } from './SettingsChannelFields';
import { notificationChannelTypes, notificationChannelLabel } from './notificationChannelTypes';

export interface ChannelDialogData {
  name: string; type: NotificationChannel['type'];
  config: Record<string, unknown>; isDefault: boolean; isActive: boolean;
}
interface Props { open: boolean; channel: NotificationChannel | null; onClose: () => void; onSave: (data: ChannelDialogData) => Promise<void>; t: TFunction; error?: string; onPersisted?: () => void }
const defaults = { smtpPort: 465, useTLS: true, useTemplate: false, toAddresses: [] };
export function SettingsChannelDialog({ open, channel, onClose, onSave, t, error, onPersisted }: Props) {
  const [data, setData] = useState<ChannelDialogData>(() => ({ name: channel?.name ?? '', type: (channel?.type as ChannelDialogData['type']) ?? 'email', config: channel ? { ...channel.config } : { ...defaults }, isDefault: channel?.isDefault ?? false, isActive: channel?.isActive ?? true }));
  const [saving, setSaving] = useState(false);
  const handleConfig = (key: string, value: unknown) => setData((previous) => ({ ...previous, config: { ...previous.config, [key]: value } }));
  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const config = { ...data.config };
    if (data.type === 'email' && Array.isArray(config.toAddresses)) config.toAddresses = config.toAddresses.filter(Boolean);
    try { await onSave({ ...data, config }); } finally { setSaving(false); }
  };
  return <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
    <form onSubmit={handleSave}>
      <DialogTitle>{t(channel ? 'settings.channels.editChannel' : 'settings.channels.addChannel')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}><TextField fullWidth required label={t('settings.channels.name')} value={data.name}
            onChange={(event) => setData({ ...data, name: event.target.value })} /></Grid>
          <Grid size={12}><TextField fullWidth select disabled={Boolean(channel)} label={t('settings.channels.type')} value={data.type}
            onChange={(event) => setData({ ...data, type: event.target.value as ChannelDialogData['type'], config: event.target.value === 'email' ? { ...defaults } : {} })}>
            {notificationChannelTypes.map((kind) => <MenuItem key={kind} value={kind}>{t(notificationChannelLabel(kind))}</MenuItem>)}
          </TextField></Grid>
          <SettingsChannelFields type={data.type} channelID={channel?.id} config={data.config} onChange={handleConfig} onReplaceConfig={(config) => setData((previous) => ({ ...previous, config }))} onPersisted={onPersisted} t={t} />
          <Grid size={12}><FormControlLabel label={t('settings.channels.setAsDefault')}
            control={<Switch checked={data.isDefault} onChange={(_, checked) => setData({ ...data, isDefault: checked })} />} /></Grid>
          <Grid size={12}><FormControlLabel label={t('settings.channels.active')}
            control={<Switch checked={data.isActive} onChange={(_, checked) => setData({ ...data, isActive: checked })} />} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions><Button disabled={saving} onClick={onClose}>{t('common.cancel')}</Button><Button disabled={saving} type="submit" variant="contained">{t(saving ? 'notificationPipeline.saving' : 'common.save')}</Button></DialogActions>
    </form>
  </Dialog>;
}
