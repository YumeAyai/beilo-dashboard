import { useCallback, useState } from 'react';
import { Alert, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Add, Delete, Edit, Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../../services/dataplane';
import { useDataplaneResource } from '../../hooks/useDataplaneResource';
import type { RuntimePolicy } from '../../types/dataplane';
import { ObservationChip, RemoteNotice } from './Observation';
import { PolicyEditor } from './PolicyEditor';

export function RuntimePolicies({ autoRefresh }: { autoRefresh: boolean }) {
  const { t } = useTranslation();
  const [inputNamespace, setInputNamespace] = useState('default');
  const [namespace, setNamespace] = useState('default');
  const [editor, setEditor] = useState<{ policy?: RuntimePolicy } | null>(null);
  const [deleting, setDeleting] = useState<RuntimePolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [saved, setSaved] = useState(false);
  const load = useCallback((signal: AbortSignal) => dataplaneApi.policies(namespace, signal), [namespace]);
  const remote = useDataplaneResource(`policies:${namespace}`, load, autoRefresh);
  const remove = async () => {
    if (!deleting) return;
    setBusy(true); setMutationError('');
    try {
      await dataplaneApi.deletePolicy(deleting.namespace, deleting.name);
      setDeleting(null); setSaved(true); await remote.refresh();
    } catch (error) { setMutationError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <Card variant="outlined" sx={{ p: 2 }}>
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
        <Typography fontWeight={600} sx={{ flex: 1 }}>{t('dataplane.policies')}</Typography>
        <TextField size="small" label={t('dataplane.namespace')} value={inputNamespace} onChange={event => setInputNamespace(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && inputNamespace.trim()) setNamespace(inputNamespace.trim()); }} />
        <Button onClick={() => setNamespace(inputNamespace.trim())} disabled={!inputNamespace.trim()}>{t('common.search')}</Button>
        <Tooltip title={t('common.refresh')}><span><IconButton aria-label={t('common.refresh')} disabled={remote.loading} onClick={() => { void remote.refresh(); }}><Refresh /></IconButton></span></Tooltip>
        <Button startIcon={<Add />} variant="contained" onClick={() => { setSaved(false); setEditor({}); }} disabled={remote.loading || !!remote.error || !remote.data}>{t('dataplane.createPolicy')}</Button>
      </Stack>
      <Alert severity="info">{t('dataplane.acceptanceHint')}</Alert>
      {saved && <Alert severity="success" onClose={() => setSaved(false)}>{t('dataplane.policySaved')}</Alert>}
      <RemoteNotice loading={remote.loading} error={remote.error} empty={remote.data?.items.length === 0 ? t('dataplane.noPolicies', { namespace }) : undefined} />
      {remote.data?.possibly_truncated && <Alert severity="warning">{t('dataplane.policyTruncated')}</Alert>}
      {!!remote.data?.items.length && <TableContainer><Table size="small">
        <TableHead><TableRow>{['policyName', 'policyKind', 'scope', 'paths', 'mode', 'execution', 'actions'].map(key => <TableCell key={key}>{t(`dataplane.${key}`)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{remote.data.items.map(policy => <TableRow key={policy.name}>
          <TableCell>{policy.name}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{policy.source_id ? `${t('runtimeLibrary.community')} · ${policy.source_id}` : t(policy.managed ? 'dataplane.managed' : 'dataplane.external')}</Typography></TableCell>
          <TableCell>{t(`dataplane.kinds.${policy.kind}`)}</TableCell>
          <TableCell>{Object.entries(policy.pod_labels).map(([key, value]) => `${key}=${value}`).join(', ') || '—'}</TableCell>
          <TableCell sx={{ maxWidth: 230, overflowWrap: 'anywhere' }}>{policy.paths.join(', ') || '—'}</TableCell>
          <TableCell>{policy.kind === 'custom' && !policy.source_id ? '—' : t(policy.enforce ? 'dataplane.enforce' : 'dataplane.observe')}</TableCell><TableCell><ObservationChip state="unknown" /></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>
            <Tooltip title={t('common.edit')}><span><IconButton aria-label={t('common.edit')} size="small" disabled={!policy.managed || policy.kind === 'custom' || !!remote.error} onClick={() => setEditor({ policy })}><Edit fontSize="small" /></IconButton></span></Tooltip>
            <Tooltip title={t('common.delete')}><span><IconButton aria-label={t('common.delete')} size="small" disabled={!policy.managed || !!remote.error} onClick={() => { setMutationError(''); setDeleting(policy); }}><Delete fontSize="small" /></IconButton></span></Tooltip>
          </TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
    </Stack>
    {editor && <PolicyEditor namespace={namespace} policy={editor.policy} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setSaved(true); void remote.refresh(); }} />}
    <Dialog open={!!deleting} onClose={busy ? undefined : () => setDeleting(null)}>
      <DialogTitle>{t('dataplane.deletePolicy')}</DialogTitle>
      <DialogContent><Typography>{deleting?.namespace}/{deleting?.name}</Typography><Alert severity="warning" sx={{ mt: 2 }}>{t('dataplane.deleteHint')}</Alert>{mutationError && <Alert severity="error">{mutationError}</Alert>}</DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setDeleting(null)}>{t('common.cancel')}</Button><Button color="error" disabled={busy} onClick={() => { void remove(); }}>{t('common.delete')}</Button></DialogActions>
    </Dialog>
  </Card>;
}
