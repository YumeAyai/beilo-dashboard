import { useCallback, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { Download, OpenInNew } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { runtimeLibraryApi } from '../../../services/runtimeLibrary';
import { useDataplaneResource } from '../../../hooks/useDataplaneResource';
import { RemoteNotice } from '../../Dataplane/Observation';
import { CommunityImportForm } from './CommunityImportForm';

interface Props { id: string; onClose: () => void; onImported: (scope: string) => void }

export function CommunityPolicyDialog({ id, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const tr = (key: string) => t(`runtimeLibrary.${key}`);
  const load = useCallback((signal: AbortSignal) => runtimeLibraryApi.detail(id, signal), [id]);
  const remote = useDataplaneResource(`community-policy:${id}`, load);
  const entry = remote.data;
  const [busy, setBusy] = useState(false);
  return <Dialog open fullWidth maxWidth="lg" onClose={busy ? undefined : onClose} aria-labelledby="community-policy-title">
    <DialogTitle id="community-policy-title">{entry?.title || tr('details')}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <RemoteNotice loading={remote.loading} error={remote.error} />
      {entry && <>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{entry.path}</Typography>
        <Typography variant="body2">{tr('actions')}：{entry.actions.join(', ')} · {tr('hooks')}：{entry.hooks.join(', ') || '—'}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>SHA-256 · {entry.sha256}</Typography>
        <Stack direction="row" gap={1}>
          <Button href={entry.source_url} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNew />}>{tr('upstream')}</Button>
          <Button href={`data:application/yaml;charset=utf-8,${encodeURIComponent(entry.yaml || '')}`} download={`${entry.title}.yaml`} startIcon={<Download />} disabled={!entry.yaml}>{tr('download')}</Button>
        </Stack>
        <Typography variant="subtitle2">{tr('originalYaml')}</Typography>
        <Box component="pre" aria-label={tr('originalYaml')} sx={{ m: 0, p: 2, maxHeight: 380, overflow: 'auto', bgcolor: 'background.default', fontSize: 12, borderRadius: 1 }}>{entry.yaml}</Box>
        <Divider />
        {entry.importable ? <CommunityImportForm key={id} entry={entry} onImported={onImported} onBusy={setBusy} /> : <Alert severity="info">{t(`runtimeLibrary.reasons.${entry.import_reason}`, { defaultValue: tr('manual') })}</Alert>}
      </>}
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>{t('common.close')}</Button></DialogActions>
  </Dialog>;
}
