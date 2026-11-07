import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import type { TFunction } from 'i18next';
import QRCode from 'qrcode';
import { notificationApi2, type WeixinBindingState } from '../../services/api';

interface Props { channelID?: string; config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void; onPersisted?: () => void; t: TFunction }
export function WeixinBindingPanel({ channelID, config, onChange, onPersisted, t }: Props) {
  const [login, setLogin] = useState<WeixinBindingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [polling, setPolling] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!login?.qrContent || !canvas.current) return;
    QRCode.toCanvas(canvas.current, login.qrContent, { width: 220, margin: 2 }).catch(() => setError(t('notificationPipeline.qrFailed')));
  }, [login?.qrContent, t]);
  // One request at a time; the backend owns the login secret and long polling.
  const pollRequest = useRef<Promise<WeixinBindingState> | null>(null);
  useEffect(() => {
    if (!polling || !login?.loginID || !channelID) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (pollRequest.current) { timer = setTimeout(poll, 500); return; }
      const request = notificationApi2.pollWeixinLogin(channelID, login.loginID!, code || undefined);
      pollRequest.current = request;
      try {
        const next = await request;
        if (stopped) return;
        setLogin((previous) => ({ ...previous, ...next }));
        if (next.channel) { onChange(next.channel.config); onPersisted?.(); }
        if (['confirmed', 'expired', 'need_verifycode', 'verify_code_blocked', 'binded_redirect'].includes(next.status)) { setPolling(false); return; }
        timer = setTimeout(poll, 1000);
      } catch (err) { if (!stopped) { setError(err instanceof Error ? err.message : String(err)); setPolling(false); } }
      finally { if (pollRequest.current === request) pollRequest.current = null; }
    };
    timer = setTimeout(poll, 1000);
    return () => { stopped = true; clearTimeout(timer); };
    // Polling restarts only on an explicit login/resume; callbacks and text are read from that action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, login?.loginID, channelID]);
  const start = async () => {
    if (!channelID) return;
    setBusy(true); setPolling(false); setError(''); setCode('');
    try { const next = await notificationApi2.startWeixinLogin(channelID); if (mounted.current) { setLogin(next); setPolling(true); } }
    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : String(err)); }
    finally { if (mounted.current) setBusy(false); }
  };
  const sync = async () => {
    if (!channelID) return;
    setBusy(true); setError('');
    try { const next = await notificationApi2.syncWeixinConversation(channelID); if (mounted.current && next.channel) { onChange(next.channel.config); onPersisted?.(); if (!next.channel.config.contextTokenConfigured) setError(t('notificationPipeline.weixinNoConversation')); } }
    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : String(err)); }
    finally { if (mounted.current) setBusy(false); }
  };
  if (!channelID) return <Alert severity="info">{t('notificationPipeline.weixinSaveFirst')}</Alert>;
  return <Stack spacing={2}>
    <Alert severity={config.contextTokenConfigured ? 'success' : 'info'}>{t(config.contextTokenConfigured ? 'notificationPipeline.weixinReady' : config.botTokenConfigured ? 'notificationPipeline.weixinSendFirst' : 'notificationPipeline.weixinHint')}</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    {config.toUserID ? <Typography variant="body2">{t('notificationPipeline.boundUser')}: {String(config.toUserID)}</Typography> : null}
    <Stack direction="row" spacing={1}>
      <Button disabled={busy || polling} onClick={start}>{t(config.botTokenConfigured ? 'notificationPipeline.weixinRebind' : 'notificationPipeline.weixinBind')}</Button>
      <Button disabled={busy || polling || !config.botTokenConfigured} onClick={sync}>{t('notificationPipeline.weixinSync')}</Button>
      {busy && <CircularProgress size={20} />}
    </Stack>
    {login && <Box sx={{ textAlign: 'center' }}>
      {login.status !== 'confirmed' && login.status !== 'expired' && <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <canvas ref={canvas} aria-label={t('notificationPipeline.weixinQR')} style={{ display: 'block', maxWidth: '100%' }} />
      </Box>}
      <Typography variant="body2" role="status">{t(`notificationPipeline.weixin_${login.status}`, { defaultValue: login.status })}</Typography>
      {login.status === 'need_verifycode' && <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField label={t('notificationPipeline.verifyCode')} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
        <Button disabled={!code || polling} onClick={() => setPolling(true)}>{t('notificationPipeline.continue')}</Button>
      </Stack>}
      {!polling && ['wait', 'scaned', 'scaned_but_redirect'].includes(login.status) && <Button onClick={() => { setError(''); setPolling(true); }}>{t('notificationPipeline.continue')}</Button>}
    </Box>}
  </Stack>;
}
