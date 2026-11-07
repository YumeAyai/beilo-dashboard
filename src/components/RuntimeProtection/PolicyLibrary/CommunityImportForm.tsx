import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CommunityPolicy } from '../../../types/runtimeLibrary';
import { useCommunityImport } from './useCommunityImport';

interface Props { entry: CommunityPolicy; onImported: (scope: string) => void; onBusy: (busy: boolean) => void }

export function CommunityImportForm({ entry, onImported, onBusy }: Props) {
  const { t } = useTranslation();
  const tr = (key: string) => t(`runtimeLibrary.${key}`);
  const form = useCommunityImport(entry, onImported, onBusy);
  const needsAcknowledgement = entry.behavior === 'enforce';
  return <Stack spacing={2}>
    <Typography fontWeight={600}>{tr('importTitle')}</Typography>
    <Alert severity={needsAcknowledgement ? 'warning' : 'info'}>{tr('scopeHint')}</Alert>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
      <TextField fullWidth required label={t('dataplane.namespace')} value={form.draft.namespace} disabled={form.busy} onChange={event => form.change({ namespace: event.target.value })} />
      <TextField fullWidth required label={t('dataplane.policyName')} value={form.draft.name} disabled={form.busy} onChange={event => form.change({ name: event.target.value })} />
    </Stack>
    <TextField required multiline minRows={2} label={t('dataplane.podLabels')} helperText={t('dataplane.labelsHint')} value={form.draft.labels} disabled={form.busy} onChange={event => form.change({ labels: event.target.value })} placeholder="app=frontend" />
    {needsAcknowledgement && <FormControlLabel control={<Checkbox checked={form.draft.acknowledged} disabled={form.busy} onChange={event => form.change({ acknowledged: event.target.checked })} />} label={tr('acknowledge')} />}
    {form.error && <Alert severity="error">{form.error}</Alert>}
    {form.preview && <Box><Typography variant="subtitle2">{tr('scopedYaml')}</Typography><Box component="pre" aria-label={tr('scopedYaml')} sx={{ p: 2, maxHeight: 360, overflow: 'auto', bgcolor: 'background.default', fontSize: 12, borderRadius: 1 }}>{form.preview.yaml}</Box></Box>}
    <Stack direction="row" gap={1} justifyContent="flex-end">
      <Button variant="outlined" disabled={form.busy} onClick={() => { void form.perform(false); }}>{tr('preview')}</Button>
      <Button variant="contained" disabled={form.busy || !form.preview || (needsAcknowledgement && !form.draft.acknowledged)} onClick={() => { void form.perform(true); }}>{form.busy ? t('common.loading') : tr('import')}</Button>
    </Stack>
  </Stack>;
}
