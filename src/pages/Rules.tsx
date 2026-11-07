import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Add, FileDownload, FileUpload, Rule as RuleIcon, ContentCopy } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRules } from '../hooks/useRules';
import { rulesApi, type GatewayInfo } from '../services/api';
import type { IngressInfo, Rule, RuleCreateInput, RuleQueryParams } from '../services/rulesData';
import { colors } from '../theme/colors';
import { RulesStats } from '../components/Rules/RulesStats';
import { RulesToolbar } from '../components/Rules/RulesToolbar';
import { RulesTable } from '../components/Rules/RulesTable';
import { RuleEditorDialog } from '../components/Rules/RuleEditorDialog';
import { RuleTestDialog } from '../components/Rules/RuleTestDialog';
import { RuleStarters } from '../components/Rules/RuleStarters';

const CrsRuleCatalog = lazy(() => import('../components/Rules/CrsRuleCatalog'));

export function RulesManagement() {
  const { t } = useTranslation();
  const { rules, total, loading, error, params, setParams, refresh, createRule, updateRule, deleteRule, enableRules, disableRules } = useRules();
  const [tab, setTab] = useState('builtin');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ingresses, setIngresses] = useState<IngressInfo[]>([]);
  const [gateways, setGateways] = useState<GatewayInfo[]>([]);
  const [targetError, setTargetError] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [initial, setInitial] = useState<RuleCreateInput>();
  const [testRule, setTestRule] = useState<Rule | null>(null);
  const [startersOpen, setStartersOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const operation = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([rulesApi.listIngresses(), rulesApi.listGateways()]).then(([ingress, gateway]) => {
      if (!active) return;
      if (ingress.status === 'fulfilled') setIngresses(ingress.value);
      if (gateway.status === 'fulfilled') setGateways(gateway.value);
      setTargetError(ingress.status === 'rejected' || gateway.status === 'rejected');
    });
    return () => { active = false; };
  }, []);

  const selected = selectedIds.filter(id => rules.some(rule => rule.id === id));
  const blocked = busy || loading || !!error;
  const changeParams = (next: RuleQueryParams) => { setSelectedIds([]); setParams(next); };
  const notifyError = (key: string, reason: unknown) => setSnackbar({ severity: 'error', message: `${t(key)}${reason instanceof Error ? `: ${reason.message}` : ''}` });
  const run = async (task: () => Promise<void>, errorKey: string) => {
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try { await task(); } catch (reason) { notifyError(errorKey, reason); }
    finally { operation.current = false; setBusy(false); }
  };
  const openEditor = (rule: Rule | null, input?: RuleCreateInput) => {
    setTab('custom'); setEditingRule(rule); setInitial(input); setEditorSession(value => value + 1); setEditorOpen(true);
  };
  const save = (input: RuleCreateInput) => run(async () => {
    if (editingRule) await updateRule(editingRule.id, input); else await createRule(input);
    setSnackbar({ severity: 'success', message: t(editingRule ? 'rules.messages.ruleUpdated' : 'rules.messages.ruleCreated') });
    setEditorOpen(false); setEditingRule(null); setSelectedIds([]);
  }, 'ruleManagement.saveFailed');
  const batch = (enable: boolean) => run(async () => {
    const ids = [...selected];
    if (!ids.length) return;
    await (enable ? enableRules(ids) : disableRules(ids));
    setSelectedIds([]);
    setSnackbar({ severity: 'success', message: t(enable ? 'rules.messages.enabledCount' : 'rules.messages.disabledCount', { count: ids.length }) });
  }, enable ? 'rules.messages.enableFailed' : 'rules.messages.disableFailed');
  const remove = (id: string) => {
    if (!window.confirm(t('rules.messages.confirmDelete'))) return;
    void run(async () => { await deleteRule(id); setSelectedIds(ids => ids.filter(value => value !== id)); setSnackbar({ severity: 'success', message: t('rules.messages.deleted') }); }, 'rules.messages.deleteFailed');
  };
  const exportRules = () => run(async () => {
    const blob = await rulesApi.exportRules(selected.length ? selected : undefined);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `beilo-custom-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'ruleManagement.exportFailed');
  const importRules = (file: File) => run(async () => {
    const result = await rulesApi.importRules(file, /\.ya?ml$/i.test(file.name) ? 'yaml' : 'json');
    await refresh(); setSelectedIds([]);
    setSnackbar({ severity: result.errors ? 'error' : 'success', message: t('ruleManagement.imported', { count: result.imported }) + (result.details?.length ? `: ${result.details.join('; ')}` : '') });
  }, 'ruleManagement.importFailed');

  return <Box>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between" sx={{ mb: 3 }}>
      <Stack direction="row" gap={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: `${colors.primary.main}15` }}><RuleIcon sx={{ color: colors.primary.main }} /></Avatar>
        <Box><Typography variant="h5" fontWeight="bold">{t('rules.title')}</Typography><Typography variant="body2" color="text.secondary">{t('ruleManagement.subtitle')}</Typography></Box>
      </Stack>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Button variant="outlined" startIcon={<ContentCopy />} onClick={() => setStartersOpen(true)} disabled={busy}>{t('ruleManagement.templates')}</Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => openEditor(null)} disabled={busy}>{t('rules.buttons.newRule')}</Button>
      </Stack>
    </Stack>
    <Tabs value={tab} onChange={(_, next: string) => { setTab(next); setSelectedIds([]); }} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
      <Tab value="builtin" label={t('ruleManagement.builtin')} />
      <Tab value="custom" label={<Stack direction="row" gap={1} alignItems="center">{t('ruleManagement.custom')}<Chip label={error ? '—' : total} size="small" sx={{ height: 20, fontSize: 11 }} /></Stack>} />
    </Tabs>
    {tab === 'builtin' ? <Suspense fallback={<Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>}><CrsRuleCatalog /></Suspense> : <Stack gap={2}>
      <Alert severity="info">{t('ruleManagement.customHint')}</Alert>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => { void refresh(); }}>{t('ruleManagement.retry')}</Button>}>{t('ruleManagement.loadFailed')}: {error}</Alert>}
      {!error && <RulesStats total={total} rules={rules} t={t} />}
      <Card><CardContent sx={{ p: 2.5 }}><RulesToolbar search={params.search || ''} params={params} loading={loading || busy} ingresses={ingresses} gateways={gateways} onSearch={search => changeParams({ ...params, search, page: 1 })} onParamsChange={changeParams} onRefresh={() => { void refresh(); }} t={t} /></CardContent></Card>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
        <Typography variant="body2" color="text.secondary">{t('ruleManagement.importHint')}</Typography>
        <Stack direction="row" gap={1}>
          <Button component="label" variant="outlined" startIcon={<FileUpload />} disabled={blocked}>{t('ruleManagement.import')}<input type="file" hidden accept=".json,.yaml,.yml" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importRules(file); }} /></Button>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={() => { void exportRules(); }} disabled={blocked}>{t(selected.length ? 'ruleManagement.exportSelected' : 'ruleManagement.exportAll')}</Button>
        </Stack>
      </Stack>
      {!!selected.length && <Alert severity="info" action={<Stack direction="row" gap={1}><Button color="inherit" size="small" disabled={blocked} onClick={() => { void batch(true); }}>{t('rules.batch.enable')}</Button><Button color="inherit" size="small" disabled={blocked} onClick={() => { void batch(false); }}>{t('rules.batch.disable')}</Button></Stack>}>{t('rules.batch.selected', { count: selected.length }).replace(/<[^>]*>/g, '')}</Alert>}
      <Card><RulesTable rules={rules} total={total} loading={loading} disabled={blocked} params={params} selectedIds={selected} onSelectAll={checked => setSelectedIds(checked ? rules.map(rule => rule.id) : [])} onSelect={id => setSelectedIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id])} onEdit={rule => openEditor(rule)} onDelete={remove} onTest={setTestRule} onPageChange={page => changeParams({ ...params, page })} onRowsPerPageChange={pageSize => changeParams({ ...params, pageSize: pageSize as 10 | 25 | 50 | 100, page: 1 })} t={t} /></Card>
      <Typography variant="caption" color="text.secondary">{t('ruleManagement.deploymentHint')}</Typography>
    </Stack>}
    <RuleEditorDialog key={editorSession} open={editorOpen} rule={editingRule} initial={initial} ingresses={ingresses} gateways={gateways} targetError={targetError} saving={busy} onClose={() => setEditorOpen(false)} onSave={input => { void save(input); }} t={t} />
    <RuleTestDialog key={testRule?.id || 'none'} open={!!testRule} rule={testRule} onClose={() => setTestRule(null)} t={t} />
    <RuleStarters open={startersOpen} onClose={() => setStartersOpen(false)} onChoose={input => { setStartersOpen(false); openEditor(null, input); }} />
    <Snackbar open={!!snackbar} autoHideDuration={6000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity={snackbar?.severity || 'success'} onClose={() => setSnackbar(null)} sx={{ maxWidth: 720, whiteSpace: 'pre-wrap' }}>{snackbar?.message}</Alert></Snackbar>
  </Box>;
}

export default RulesManagement;
