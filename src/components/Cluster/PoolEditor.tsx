import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { clusterApi } from '../../services/cluster';
import type { IPPool, IPPoolInput } from '../../types/cluster';
import { blockText, parseBlocks, poolInput, poolInUse } from './poolInput';

export function PoolEditor({ pool, onClose, onSaved }: { pool?: IPPool; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const tr = (key: string, fallback?: string) => t(`clusterManagement.${key}`, { defaultValue: fallback || key });
  const [name, setName] = useState(pool?.name || '');
  const [blocks, setBlocks] = useState(blockText(pool?.blocks || []));
  const [selector, setSelector] = useState(pool?.service_selector ? JSON.stringify(pool.service_selector, null, 2) : '');
  const [reserve, setReserve] = useState(pool?.allow_first_last_ips || '');
  const [disabled, setDisabled] = useState(pool?.disabled || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = !!pool && poolInUse(pool);
  const save = async () => {
    setBusy(true); setError('');
    try {
      let input: IPPoolInput;
      if (pool && locked) input = { ...poolInput(pool), disabled };
      else {
        let serviceSelector = null;
        if (selector.trim()) {
          try { serviceSelector = JSON.parse(selector); if (!serviceSelector || typeof serviceSelector !== 'object' || Array.isArray(serviceSelector)) throw new Error(); }
          catch { throw new Error('invalid_selector'); }
        }
        input = { name: name.trim(), resource_version: pool?.resource_version || '', blocks: parseBlocks(blocks), disabled, service_selector: serviceSelector, allow_first_last_ips: reserve as IPPoolInput['allow_first_last_ips'] };
      }
      await clusterApi.savePool(input, !pool); onSaved();
    } catch (reason) { const message = reason instanceof Error ? reason.message : String(reason); setError(tr(`error_${message}`, message)); }
    finally { setBusy(false); }
  };
  return <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{tr(pool ? 'editPool' : 'newPool')}</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField required label={tr('poolName')} value={name} onChange={event => setName(event.target.value)} disabled={!!pool || busy} />
      <TextField required multiline minRows={3} label={tr('addresses')} value={blocks} onChange={event => setBlocks(event.target.value)} disabled={locked || busy} helperText={tr('blocksHint')} placeholder="192.168.2.3 - 192.168.2.100" />
      <TextField multiline minRows={3} label={tr('selector')} value={selector} onChange={event => setSelector(event.target.value)} disabled={locked || busy} helperText={tr('selectorHint')} placeholder={'{"matchLabels":{"environment":"production"}}'} />
      <FormControlLabel control={<Switch checked={reserve === 'No'} onChange={event => setReserve(event.target.checked ? 'No' : 'Yes')} disabled={locked || busy} />} label={tr('reserve')} />
      <FormControlLabel control={<Switch checked={disabled} onChange={event => setDisabled(event.target.checked)} disabled={busy} />} label={tr('disabled')} />
      <Alert severity={locked ? 'warning' : 'info'}>{tr('poolEditHint')}</Alert>
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>{t('common.cancel')}</Button><Button variant="contained" disabled={busy || !name.trim() || !blocks.trim()} onClick={() => { void save(); }}>{t('common.save')}</Button></DialogActions>
  </Dialog>;
}
