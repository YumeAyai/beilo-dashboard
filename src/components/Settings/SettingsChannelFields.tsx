import { Alert, FormControlLabel, Grid, MenuItem, Switch, TextField } from '@mui/material';
import type { TFunction } from 'i18next';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { WeixinBindingPanel } from './WeixinBindingPanel';

interface Props { type: string; channelID?: string; config: Record<string, unknown>; onChange: (key: string, value: unknown) => void; onReplaceConfig: (config: Record<string, unknown>) => void; onPersisted?: () => void; t: TFunction }
export function SettingsChannelFields({ type, channelID, config, onChange, onReplaceConfig, onPersisted, t }: Props) {
  const text = (key: string, secret = false, required = false) => (
    <Grid size={12} key={key}><TextField fullWidth required={required} type={secret ? 'password' : 'text'}
      label={t(`notificationPipeline.${key}`)} value={String(config[key] ?? '')}
      autoComplete={secret ? 'new-password' : 'off'}
      helperText={secret && config[`${key}Configured`] ? t('notificationPipeline.secretPreserved') : undefined}
      onChange={(event) => onChange(key, event.target.value)} /></Grid>
  );
  if (type === 'weixin') return <Grid size={12}><WeixinBindingPanel channelID={channelID} config={config} onChange={onReplaceConfig} onPersisted={onPersisted} t={t} /></Grid>;
  if (type === 'telegram') return <>
    <Grid size={12}><Alert severity="info">{t('notificationPipeline.telegramHint')}</Alert></Grid>
    {text('botToken', true, !config.botTokenConfigured)}{text('chatID', false, true)}
  </>;
  if (type !== 'email') return <>
    {['wecom', 'feishu', 'lark', 'discord', 'teams'].includes(type) && <Grid size={12}><Alert severity="info">{t(`notificationPipeline.${type}Hint`)}</Alert></Grid>}
    {text(type === 'webhook' ? 'url' : 'webhookURL', true, !config[`${type === 'webhook' ? 'url' : 'webhookURL'}Configured`])}
    {['dingtalk', 'feishu', 'lark'].includes(type) && text('secret', true)}
    {type === 'webhook' && <Grid size={12}><TextField fullWidth select label={t('notificationPipeline.method')}
      value={config.method ?? 'POST'} onChange={(event) => onChange('method', event.target.value)}>
      <MenuItem value="POST">POST</MenuItem><MenuItem value="PUT">PUT</MenuItem>
    </TextField></Grid>}
  </>;
  return <>
    {text('smtpHost', false, true)}
    <Grid size={12}><TextField fullWidth required label={t('notificationPipeline.smtpPort')} type="number"
      value={config.smtpPort ?? 465} slotProps={{ htmlInput: { min: 1, max: 65535 } }}
      onChange={(event) => onChange('smtpPort', Number(event.target.value))} /></Grid>
    {text('username')}{text('password', true)}{text('fromAddress', false, true)}
    <Grid size={12}><TextField fullWidth required multiline label={t('notificationPipeline.toAddresses')}
      value={Array.isArray(config.toAddresses) ? config.toAddresses.join(', ') : ''}
      helperText={t('notificationPipeline.recipientHint')}
      onChange={(event) => onChange('toAddresses', event.target.value.split(/[,;\n]/).map((value) => value.trim()))} /></Grid>
    <Grid size={12}><FormControlLabel label={t('notificationPipeline.useTLS')}
      control={<Switch checked={config.useTLS !== false} onChange={(_, checked) => onChange('useTLS', checked)} />} /></Grid>
    <EmailTemplateSelector config={config} onChange={onChange} />
  </>;
}
