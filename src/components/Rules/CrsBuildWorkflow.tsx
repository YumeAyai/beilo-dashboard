import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { crsBuildApi, type BuildRelease, type CrsBuildStatus } from '../../services/crsBuild';

export function CrsBuildWorkflow({ release, onStatus, refreshKey = 0 }: { release: BuildRelease | null; onStatus?: (status: CrsBuildStatus | null) => void; refreshKey?: number }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CrsBuildStatus>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const lock = useRef(false);
  const mounted = useRef(false);
  const statusRequest = useRef<Promise<void> | null>(null);
  const load = useCallback(async () => {
    if (statusRequest.current) return statusRequest.current;
    const request = (async () => {
      try { const data = await crsBuildApi.status(); if (mounted.current) { setStatus(data); setError(''); onStatus?.(data); } }
      catch (reason) { if (mounted.current) { setError(reason instanceof Error ? reason.message : String(reason)); onStatus?.(null); } }
    })();
    statusRequest.current = request;
    try { await request; } finally { statusRequest.current = null; }
  }, [onStatus]);
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [load, refreshKey]);
  const building = status?.builds.some(build => build.state === 'building' || build.state === 'pending');
  useEffect(() => { if (!building) return; const timer = window.setInterval(() => { if (!lock.current) void load(); }, 5000); return () => window.clearInterval(timer); }, [building, load]);
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await statusRequest.current; await action(); setTarget(''); await load(); }
    catch (reason) { if (mounted.current) { setTarget(''); setError(reason instanceof Error ? reason.message : String(reason)); } }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const selected = status?.builds.find(build => build.artifact?.moduleSHA256 === status.activeSHA256);
  const short = (value: string) => value.slice(0, 12);
  const canMutate = !!status?.enabled && !error;
  const moduleLabel = selected?.release.version || (status?.activeSHA256 ? short(status.activeSHA256)
    : !status && !error ? t('common.loading')
    : status?.inventoryState === 'not_configured' ? t('crsBuild.notSet') : t('crsBuild.unavailable'));
  return <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
      <Typography variant="subtitle2">{t('crsBuild.title')}</Typography>
      <Chip size="small" variant="outlined" label={`${t('crsBuild.selected')}: ${moduleLabel}`} />
      <Button size="small" disabled={busy} onClick={() => { void load(); }}>{t('common.refresh')}</Button>
      <Button size="small" variant="contained" disabled={busy || !canMutate || !release} onClick={() => { if (release) void run(() => crsBuildApi.start(release)); }}>{t('crsBuild.build')}</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    {status && !(status.buildConfigured ?? status.enabled) && <Alert severity="info" sx={{ mt: 1 }}>{t('crsBuild.notConfigured')}</Alert>}
    {status?.inventoryState && status.inventoryState !== 'ready' && <Alert severity="warning" sx={{ mt: 1 }}>{t(`crsBuild.inventory.${status.inventoryState}`)}</Alert>}
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('crsBuild.explanation')}</Typography>
    {status?.builds.map(build => <Box key={build.id} sx={{ mt: 1.5, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Typography variant="body2" fontWeight={600}>CRS {build.release.version}</Typography>
        <Chip size="small" label={t(`crsBuild.states.${build.state}`)} color={build.state === 'failed' || build.state === 'unavailable' ? 'warning' : build.state === 'selected' ? 'info' : 'default'} />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{build.id}</Typography>
        {(build.state === 'failed' || build.state === 'expired') && <Button size="small" disabled={busy || !canMutate} onClick={() => { void run(() => crsBuildApi.start(build.release, build.id)); }}>{t('crsBuild.retry')}</Button>}
        {build.state === 'built' && <Button size="small" disabled={busy || !canMutate} onClick={() => { void run(() => crsBuildApi.stage(build.id)); }}>{t('crsBuild.stage')}</Button>}
        {build.state === 'staged' && build.artifact && <Button size="small" disabled={busy || !canMutate} onClick={() => setTarget(build.artifact!.moduleSHA256)}>{t('crsBuild.apply')}</Button>}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', display: 'block', mt: 0.5 }}>Commit: {build.release.commit}{build.artifact && ` · SHA256: ${build.artifact.moduleSHA256}`}</Typography>
      {build.reason && <Typography variant="caption" color="error">{build.reason}</Typography>}
    </Box>)}
    {status && status.modules.length > 1 && <TextField select size="small" label={t('crsBuild.switchVersion')} value="" onChange={event => setTarget(event.target.value)} disabled={busy || !canMutate} sx={{ mt: 2, minWidth: 260 }}>
      {status.modules.filter(module => module.sha256 !== status.activeSHA256).map(module => <MenuItem value={module.sha256} key={module.sha256}>{status.builds.find(build => build.artifact?.moduleSHA256 === module.sha256)?.release.version || t('crsBuild.retained')} · {short(module.sha256)}</MenuItem>)}
    </TextField>}
    <Dialog open={!!target} onClose={() => { if (!busy) setTarget(''); }} maxWidth="sm" fullWidth>
      <DialogTitle>{t('crsBuild.apply')}</DialogTitle>
      <DialogContent><Alert severity="info">{t('crsBuild.applyHint')}</Alert><Typography variant="body2" sx={{ mt: 2, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{target}</Typography></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setTarget('')}>{t('common.cancel')}</Button><Button variant="contained" disabled={busy || !canMutate} onClick={() => { if (status) void run(() => crsBuildApi.select(target, status.activeSHA256)); }}>{t('crsBuild.apply')}</Button></DialogActions>
    </Dialog>
  </Box>;
}
