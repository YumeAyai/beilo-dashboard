import { useCallback, useState } from 'react';
import { Alert, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { runtimeLibraryApi } from '../../../services/runtimeLibrary';
import { useDataplaneResource } from '../../../hooks/useDataplaneResource';
import { RemoteNotice } from '../../Dataplane/Observation';
import { CommunityPolicyDialog } from './CommunityPolicyDialog';
import { CommunityPolicyTable } from './CommunityPolicyTable';
import { filterCommunityPolicies } from './model';

export function RuntimePolicyLibrary() {
  const { t } = useTranslation();
  const tr = (key: string) => t(`runtimeLibrary.${key}`);
  const load = useCallback((signal: AbortSignal) => runtimeLibraryApi.catalog(signal), []);
  const remote = useDataplaneResource('runtime-community-library', load);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [behavior, setBehavior] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState('');
  const [imported, setImported] = useState('');
  const entries = filterCommunityPolicies(remote.data?.entries || [], search, category, behavior);
  const onImported = (scope: string) => { setSelected(''); setImported(scope); };
  return <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}><Stack spacing={2}>
    <Stack direction="row" alignItems="center" gap={1}><Typography fontWeight={600} sx={{ flex: 1 }}>{tr('title')}</Typography><Button startIcon={<Refresh />} disabled={remote.loading} onClick={() => { void remote.refresh(); }}>{t('common.refresh')}</Button></Stack>
    <Typography variant="body2" color="text.secondary">{tr('subtitle')}</Typography>
    {remote.data && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{t('runtimeLibrary.snapshot', { count: remote.data.entries.length, version: remote.data.version, commit: remote.data.commit.slice(0, 12), license: remote.data.license })}</Typography>}
    <Alert severity="info">{tr('sourceHint')}</Alert>
    {imported && <Alert severity="success" onClose={() => setImported('')}>{t('runtimeLibrary.imported', { scope: imported })}</Alert>}
    <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
      <TextField size="small" label={tr('search')} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} sx={{ flex: 1 }} />
      <TextField select size="small" label={tr('category')} value={category} onChange={event => { setCategory(event.target.value); setPage(0); }} sx={{ minWidth: 160 }}><MenuItem value="">{tr('allCategories')}</MenuItem>{['process', 'file', 'network', 'privilege', 'kernel', 'other'].map(value => <MenuItem key={value} value={value}>{tr(`categories.${value}`)}</MenuItem>)}</TextField>
      <TextField select size="small" label={tr('actions')} value={behavior} onChange={event => { setBehavior(event.target.value); setPage(0); }} sx={{ minWidth: 160 }}><MenuItem value="">{tr('allBehaviors')}</MenuItem>{['observe', 'enforce', 'other'].map(value => <MenuItem key={value} value={value}>{tr(`behaviors.${value}`)}</MenuItem>)}</TextField>
    </Stack>
    <RemoteNotice loading={remote.loading} error={remote.error} empty={entries.length ? undefined : tr('empty')} />
    {!!entries.length && <CommunityPolicyTable entries={entries} page={Math.min(page, Math.max(0, Math.ceil(entries.length / 15) - 1))} onPage={setPage} onSelect={setSelected} />}
  </Stack>{selected && <CommunityPolicyDialog key={selected} id={selected} onClose={() => setSelected('')} onImported={onImported} />}</Card>;
}
