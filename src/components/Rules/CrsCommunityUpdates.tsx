import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { Download, OpenInNew, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { compareCrsVersions, crsUpgradePlan, CRS_RELEASES_URL } from '../../services/crsCommunity';
import { crsBuildApi, type BuildRelease, type CrsBuildStatus } from '../../services/crsBuild';
import { CrsBuildWorkflow } from './CrsBuildWorkflow';

export function CrsCommunityUpdates({ version, sourceSHA256, onStatus, refreshKey }: { version?: string; sourceSHA256: string; onStatus?: (status: CrsBuildStatus | null) => void; refreshKey?: number }) {
  const { t, i18n } = useTranslation();
  const [release, setRelease] = useState<BuildRelease | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState<string>();
  const [details, setDetails] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const check = async () => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 10000);
    setLoading(true); setError('');
    try {
      const result = await crsBuildApi.check(request.signal);
      if (!request.signal.aborted) { setRelease(result); setCheckedAt(new Date().toISOString()); }
    } catch (reason) {
      if (controller.current === request) { setRelease(null); setError(`${t('crsUpdates.checkFailed')}${reason instanceof Error ? `: ${reason.message}` : ''}`); }
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === request) setLoading(false);
    }
  };
  const downloadPlan = () => {
    if (!release || !version || !sourceSHA256) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(crsUpgradePlan(release, version, sourceSHA256), null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `beilo-crs-upgrade-${release.version}.json`;
    document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
      <Box><Typography variant="subtitle1" fontWeight={600}>{t('crsUpdates.title')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('crsUpdates.description')}</Typography></Box>
      <Button variant="outlined" startIcon={<Refresh />} disabled={loading} onClick={() => { void check(); }} sx={{ flexShrink: 0 }}>{t(loading ? 'crsUpdates.checking' : 'crsUpdates.check')}</Button>
    </Stack>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
      <Chip size="small" variant="outlined" label={`${t('crsUpdates.reference')}: ${version || t('crsBuild.unknown')}`} />
      <Chip size="small" variant="outlined" label={`${t('crsUpdates.latest')}: ${release?.version || t('crsUpdates.notChecked')}`} />
      {release && version && <Chip size="small" color={compareCrsVersions(release.version, version) > 0 ? 'info' : 'default'} label={t(compareCrsVersions(release.version, version) > 0 ? 'crsUpdates.available' : 'crsUpdates.noNewer')} />}
    </Stack>
    {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
    {release && <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary">{t('crsUpdates.published')}: {new Date(release.publishedAt).toLocaleDateString(i18n.resolvedLanguage)} · {t('crsUpdates.checked')}: {new Date(checkedAt!).toLocaleString(i18n.resolvedLanguage)}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        <Button size="small" onClick={() => setDetails(true)}>{t('crsUpdates.notes')}</Button>
        <Button size="small" component="a" href={release.sourceURL} target="_blank" rel="noreferrer" startIcon={<Download />}>{t('crsUpdates.download')}</Button>
        <Button size="small" disabled={!version || !sourceSHA256} onClick={downloadPlan}>{t('crsUpdates.plan')}</Button>
      </Stack>
      <Alert severity="info" sx={{ mt: 1 }}>{t('crsUpdates.workflow')}</Alert>
    </Box>}
    <Button size="small" component="a" href={CRS_RELEASES_URL} target="_blank" rel="noreferrer" endIcon={<OpenInNew sx={{ fontSize: 14 }} />} sx={{ mt: 1 }}>{t('crsUpdates.official')}</Button>
    <CrsBuildWorkflow release={release} onStatus={onStatus} refreshKey={refreshKey} />
    <Dialog open={details} onClose={() => setDetails(false)} fullWidth maxWidth="md">
      <DialogTitle>OWASP CRS {release?.version} · {t('crsUpdates.notes')}</DialogTitle>
      <DialogContent dividers><Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, lineHeight: 1.7 }}>{release?.notes || t('crsUpdates.noNotes')}</Box></DialogContent>
      <DialogActions><Button onClick={() => setDetails(false)}>{t('common.close')}</Button></DialogActions>
    </Dialog>
  </Card>;
}
