import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../../services/dataplane';
import type { RuntimePolicy } from '../../types/dataplane';
import { policyInput, PolicyValidationError } from './runtimeHelpers';

interface Props { namespace: string; policy?: RuntimePolicy; onClose: () => void; onSaved: () => void }

export function PolicyEditor({ namespace, policy, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(policy?.name || '');
  const [kind, setKind] = useState<'exec' | 'file'>(policy?.kind === 'file' ? 'file' : 'exec');
  const [labels, setLabels] = useState(Object.entries(policy?.pod_labels || {}).map(([key, value]) => `${key}=${value}`).join('\n'));
  const [paths, setPaths] = useState(policy?.paths.join('\n') || '');
  const [enforce, setEnforce] = useState(policy?.enforce || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setError(''); setSaving(true);
    try {
      const input = policyInput({ namespace, name, kind, labels, paths, enforce });
      await dataplaneApi.savePolicy(namespace, name, input);
      onSaved();
    } catch (reason) {
      setError(reason instanceof PolicyValidationError ? t(`dataplane.validation.${reason.message}`) : reason instanceof Error ? reason.message : String(reason));
    } finally { setSaving(false); }
  };
  return <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>{policy ? t('dataplane.editPolicy') : t('dataplane.createPolicy')}</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label={t('dataplane.namespace')} value={namespace} disabled />
      <TextField label={t('dataplane.policyName')} value={name} disabled={!!policy || saving} onChange={event => setName(event.target.value)} required />
      <TextField select label={t('dataplane.policyKind')} value={kind} disabled={saving} onChange={event => setKind(event.target.value as 'exec' | 'file')}>
        <MenuItem value="exec">{t('dataplane.execKind')}</MenuItem><MenuItem value="file">{t('dataplane.fileKind')}</MenuItem>
      </TextField>
      <TextField label={t('dataplane.podLabels')} value={labels} onChange={event => setLabels(event.target.value)} disabled={saving} multiline minRows={2} helperText={t('dataplane.labelsHint')} placeholder="app=frontend" required />
      <TextField label={kind === 'exec' ? t('dataplane.executables') : t('dataplane.files')} value={paths} onChange={event => setPaths(event.target.value)} disabled={saving} multiline minRows={3} helperText={t('dataplane.pathsHint', { limit: kind === 'exec' ? 20 : 10 })} required />
      <FormControlLabel control={<Switch checked={enforce} disabled={saving} onChange={event => setEnforce(event.target.checked)} />} label={t('dataplane.enforceSwitch')} />
      <Alert severity={enforce ? 'warning' : 'info'}>{t(enforce ? 'dataplane.enforceHint' : 'dataplane.observeHint')}</Alert>
      <Alert severity="info">{t('dataplane.acceptanceHint')}</Alert>
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button variant="contained" onClick={() => { void save(); }} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button></DialogActions>
  </Dialog>;
}
