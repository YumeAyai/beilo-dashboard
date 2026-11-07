import { useState } from 'react';
import { Box, Button, Chip, FormControlLabel, Checkbox, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { TFunction } from 'i18next';
import type { NotificationChannel, NotificationRule } from '../../services/api';
interface Props { channels: NotificationChannel[]; rules: NotificationRule[]; busy: boolean; onCreate: (name: string, severity: string, ids: string[]) => Promise<void>; onDelete: (id: string) => Promise<void>; t: TFunction }
export function NotificationRules({ channels, rules, busy, onCreate, onDelete, t }: Props) {
  const [name, setName] = useState(''); const [severity, setSeverity] = useState('high'); const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string, checked: boolean) => setSelected((ids) => checked ? [...ids, id] : ids.filter((value) => value !== id));
  const create = async () => { await onCreate(name, severity, selected); };
  return <Box sx={{ mt: 4 }}>
    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>{t('notificationPipeline.rules')}</Typography>
    <Stack spacing={2}>
      {rules.map((rule) => <Stack key={rule.id} direction="row" spacing={1} alignItems="center">
        <Typography sx={{ flex: 1 }}>{rule.name}</Typography>
        <Chip size="small" label={t(rule.isActive ? 'notificationPipeline.enabled' : 'notificationPipeline.disabled')} />
        <Button disabled={busy} size="small" color="error" onClick={() => void onDelete(rule.id)}>{t('notificationPipeline.delete')}</Button>
      </Stack>)}
      {!rules.length && <Typography color="text.secondary" variant="body2">{t('notificationPipeline.noRules')}</Typography>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField size="small" fullWidth label={t('notificationPipeline.ruleName')} value={name} onChange={(event) => setName(event.target.value)} />
        <TextField select size="small" sx={{ minWidth: 170 }} label={t('notificationPipeline.severity')} value={severity} onChange={(event) => setSeverity(event.target.value)}>
          {['info', 'low', 'medium', 'high', 'critical'].map((level) => <MenuItem key={level} value={level}>{t(`notificationPipeline.${level}`)}</MenuItem>)}
        </TextField>
      </Stack>
      <Box><Typography variant="body2">{t('notificationPipeline.channels')}</Typography>
        {channels.filter((channel) => channel.isActive).map((channel) => <FormControlLabel key={channel.id} label={channel.name}
          control={<Checkbox checked={selected.includes(channel.id)} onChange={(_, checked) => toggle(channel.id, checked)} />} />)}
        {!channels.some((channel) => channel.isActive) && <Typography variant="body2" color="text.secondary">{t('notificationPipeline.noChannel')}</Typography>}
      </Box>
      <Button variant="outlined" disabled={busy || !name.trim() || !selected.length} onClick={() => void create()} sx={{ alignSelf: 'flex-start' }}>{t('notificationPipeline.addRule')}</Button>
    </Stack>
  </Box>;
}
