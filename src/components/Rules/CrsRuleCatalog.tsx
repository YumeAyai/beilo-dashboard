import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Search, VisibilityOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { CrsCommunityUpdates } from './CrsCommunityUpdates';
import { OwaspIcon } from './OwaspIcon';
import { crsBuildApi, type CrsBuildStatus, type CrsRuleCatalog as Catalog } from '../../services/crsBuild';

type CatalogRule = Catalog['rules'][number];

export default function CrsRuleCatalog() {
  const { t } = useTranslation();
  const [buildStatus, setBuildStatus] = useState<CrsBuildStatus | null>();
  const [loadedCatalog, setCatalog] = useState<Catalog>();
  const [catalogError, setCatalogError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [phase, setPhase] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selection, setSelection] = useState<{ rule: CatalogRule; moduleSHA256: string } | null>(null);
  const activeSHA = buildStatus?.activeSHA256 || '';
  const requestKey = `${activeSHA}:${retry}`;
  const [previousRequestKey, setPreviousRequestKey] = useState(requestKey);
  if (previousRequestKey !== requestKey) {
    setPreviousRequestKey(requestKey);
    setCatalog(undefined); setCatalogError(''); setPage(0); setGroup(''); setPhase(''); setSelection(null);
  }
  const catalog = loadedCatalog?.moduleSHA256 === activeSHA ? loadedCatalog : undefined;
  const activeVersion = catalog?.version || buildStatus?.builds.find(build => build.artifact?.moduleSHA256 === activeSHA)?.release.version;
  useEffect(() => {
    const request = new AbortController();
    if (activeSHA) {
      void crsBuildApi.catalog(activeSHA, request.signal).then(data => {
        if (!request.signal.aborted) {
          if (data.moduleSHA256 !== activeSHA) throw new Error('Catalog module identity mismatch');
          setCatalog(data);
        }
      }).catch(reason => { if (!request.signal.aborted) setCatalogError(reason instanceof Error ? reason.message : String(reason)); });
    }
    return () => request.abort();
  }, [activeSHA, retry]);
  const orderedRules = useMemo(() => [...(catalog?.rules || [])].sort((a, b) => Number(b.tags.some(tag => tag.startsWith('attack-'))) - Number(a.tags.some(tag => tag.startsWith('attack-'))) || Number(a.id) - Number(b.id)), [catalog]);
  const selected = catalog && selection?.moduleSHA256 === activeSHA ? selection.rule : null;
  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return orderedRules.filter(rule => (!group || rule.file === group)
      && (!phase || String(rule.phase ?? 'default') === phase)
      && (!text || `${rule.id} ${rule.message} ${rule.file} ${rule.tags.join(' ')} ${rule.directive}`.toLowerCase().includes(text)));
  }, [search, group, phase, orderedRules]);

  return <Stack gap={2}>
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
        <Box sx={{ p: 1.5, display: 'flex', bgcolor: 'action.hover', borderRadius: 2, color: 'primary.main' }}><OwaspIcon fontSize="large" /></Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600}>OWASP Core Rule Set <Typography component="span" color="text.secondary">{activeVersion || (buildStatus === undefined ? t('common.loading') : '—')}</Typography></Typography>
          <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
            {catalog && <Chip label={t('ruleManagement.ruleCount', { count: catalog.rules.length })} size="small" />}
            {catalog && <Chip label={t('ruleManagement.groupCount', { count: catalog.groups.length })} size="small" variant="outlined" />}
            <Chip label={t('ruleManagement.moduleCatalog')} size="small" variant="outlined" />
          </Stack>
        </Box>
        <Chip label={t('ruleManagement.readonly')} size="small" variant="outlined" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 1100 }}>{t('ruleManagement.referenceHint')}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('ruleManagement.moduleCatalogHint')}{activeSHA && ` · SHA256: ${activeSHA}`}</Typography>
    </Card>
    <CrsCommunityUpdates version={activeVersion} sourceSHA256={catalog?.sourceSHA256 || ''} onStatus={setBuildStatus} refreshKey={retry} />
    {!catalog && (catalogError || buildStatus === null || (buildStatus && !activeSHA) ? <Alert severity="warning" action={<Button onClick={() => setRetry(value => value + 1)}>{t('ruleManagement.retry')}</Button>}>{t('ruleManagement.catalogUnavailable')}{catalogError && `: ${catalogError}`}</Alert> : <Stack direction="row" gap={1} sx={{ p: 3 }}><CircularProgress size={20} />{t('common.loading')}</Stack>)}
    {catalog && <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} sx={{ p: 2.5 }}>
        <TextField size="small" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder={t('ruleManagement.searchBuiltin')} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': t('ruleManagement.searchBuiltin') } }} sx={{ flex: 1, minWidth: 220 }} />
        <TextField select size="small" value={group} onChange={event => { setGroup(event.target.value); setPage(0); }} slotProps={{ select: { displayEmpty: true } }} sx={{ minWidth: 240, maxWidth: { md: 380 } }}>
          <MenuItem value="">{t('ruleManagement.allGroups')}</MenuItem>
          {catalog.groups.map(item => <MenuItem key={item.file} value={item.file}>{item.file.replace('.conf', '')} ({item.count})</MenuItem>)}
        </TextField>
        <TextField select size="small" value={phase} onChange={event => { setPhase(event.target.value); setPage(0); }} slotProps={{ select: { displayEmpty: true } }} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('ruleManagement.allPhases')}</MenuItem>
          {[1, 2, 3, 4, 5].map(value => <MenuItem key={value} value={String(value)}>{t('ruleManagement.phase', { phase: value })}</MenuItem>)}
          <MenuItem value="default">{t('ruleManagement.inheritedPhase')}</MenuItem>
        </TextField>
        {(search || group || phase) && <Button onClick={() => { setSearch(''); setGroup(''); setPhase(''); setPage(0); }}>{t('ruleManagement.reset')}</Button>}
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell sx={{ width: 110 }}>{t('ruleManagement.id')}</TableCell>
            <TableCell>{t('rules.table.name')}</TableCell>
            <TableCell>{t('ruleManagement.group')}</TableCell>
            <TableCell>{t('rules.editor.phase')}</TableCell>
            <TableCell align="right">{t('rules.table.actions')}</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filtered.slice(page * pageSize, (page + 1) * pageSize).map(rule => <TableRow key={rule.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>{rule.id}</TableCell>
              <TableCell sx={{ maxWidth: 480 }}>
                <Typography variant="body2" noWrap title={rule.message || rule.directive}>{rule.message || rule.directive.split('\n')[0]}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 480 }}>{rule.tags.filter(tag => tag.startsWith('attack-') || tag.startsWith('paranoia-level/')).join(' · ') || 'OWASP CRS'}</Typography>
              </TableCell>
              <TableCell><Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{rule.file.replace(/^(REQUEST|RESPONSE)-/, '').replace('.conf', '')}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{rule.phase ? t('ruleManagement.phase', { phase: rule.phase }) : '—'}</TableCell>
              <TableCell align="right"><Button size="small" startIcon={<VisibilityOutlined fontSize="small" />} onClick={() => setSelection({ rule, moduleSHA256: activeSHA })}>{t('ruleManagement.detail')}</Button></TableCell>
            </TableRow>)}
            {!filtered.length && <TableRow><TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>{t('ruleManagement.noResults')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={event => { setPageSize(Number(event.target.value)); setPage(0); }} labelRowsPerPage={t('rules.pagination.rowsPerPage')} labelDisplayedRows={({ from, to, count }) => t('rules.pagination.displayRows', { from, to, count })} />
    </Card>}
    <Dialog open={!!selected} onClose={() => setSelection(null)} maxWidth="md" fullWidth>
      <DialogTitle>{selected?.id} · {t('ruleManagement.detail')}</DialogTitle>
      <DialogContent dividers>
        {selected && catalog && <Stack gap={2}>
          <Typography fontWeight={600}>{selected.message || selected.id}</Typography>
          <Typography variant="body2" color="text.secondary">{selected.file} · CRS {activeVersion || (buildStatus === undefined ? t('common.loading') : '—')}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>{selected.tags.map((tag, index) => <Chip key={`${tag}-${index}`} label={tag} size="small" variant="outlined" />)}</Stack>
          <Typography variant="subtitle2">{t('ruleManagement.directive')}</Typography>
          <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto', maxHeight: 400, fontSize: 12, lineHeight: 1.7 }}>{selected.directive}</Box>
          <Alert severity="info">{t('ruleManagement.referenceHint')}</Alert>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{t('ruleManagement.source')}: {catalog.source}<br />SHA256: {catalog.sourceSHA256}<br />Apache-2.0 · <a href={`https://github.com/coreruleset/coreruleset/blob/${catalog.commit}/LICENSE`} target="_blank" rel="noreferrer">License</a> · <a href={`https://github.com/coreruleset/coreruleset/blob/${catalog.commit}/NOTICE`} target="_blank" rel="noreferrer">Notice</a></Typography>
        </Stack>}
      </DialogContent>
      <DialogActions><Button onClick={() => setSelection(null)}>{t('ruleManagement.close')}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
