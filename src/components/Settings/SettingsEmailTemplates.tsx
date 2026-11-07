import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Download, Save } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { applyEmailDesign, createEmailPresets, previewEmailTemplate, sandboxEmailPreview, type EmailTemplate, type EmailTemplateDesign } from '../../email/templates';
import { EmailTemplateAPIError, emailTemplateApi } from '../../services/emailTemplates';

interface EditorState { drafts: Record<string, EmailTemplate>; saved: Record<string, EmailTemplate>; dirty: Set<string> }
type EditorAction = { type: 'load'; templates: EmailTemplate[] } | { type: 'edit' | 'saved'; template: EmailTemplate } | { type: 'restore'; id: string; preset: EmailTemplate };
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'load') {
    const saved = { ...state.saved }, drafts = { ...state.drafts };
    for (const template of action.templates) { saved[template.id] = template; if (!state.dirty.has(template.id)) drafts[template.id] = template; }
    return { ...state, saved, drafts };
  }
  const template = action.type === 'restore' ? state.saved[action.id] ?? action.preset : action.template;
  const dirty = new Set(state.dirty);
  if (action.type === 'edit') dirty.add(template.id); else dirty.delete(template.id);
  return { drafts: { ...state.drafts, [template.id]: template }, saved: action.type === 'saved' ? { ...state.saved, [template.id]: template } : state.saved, dirty };
}

export function SettingsEmailTemplates() {
  const { t } = useTranslation();
  const presets = useMemo(() => createEmailPresets(id => t(`emailTemplates.scenes.${id}`)), [t]);
  const [state, dispatch] = useReducer(editorReducer, presets, (templates): EditorState => ({ drafts: Object.fromEntries(templates.map(template => [template.id, template])), saved: {}, dirty: new Set<string>() }));
  const [selected, setSelected] = useState(presets[0].id);
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [width, setWidth] = useState(600);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const describeError = useCallback((err: unknown) => {
    if (err instanceof EmailTemplateAPIError) {
      if (err.status === 404) return t('emailTemplates.unavailable');
      if (err.status === 409) return t('emailTemplates.conflict');
      if (err.status === 403) return t('emailTemplates.forbidden');
    }
    return err instanceof Error ? err.message : t('emailTemplates.failed');
  }, [t]);
  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    try {
      const templates = await emailTemplateApi.list();
      if (!isActive()) return;
      dispatch({ type: 'load', templates }); setAvailable(true); setError('');
    } catch (err) { if (isActive()) { setAvailable(false); setError(describeError(err)); } }
    finally { if (isActive()) setLoading(false); }
  }, [describeError]);
  useEffect(() => { let active = true; void load(() => active); return () => { active = false; }; }, [load]);
  // Unedited presets follow layout updates, including Vite hot reloads.
  const draft = !state.dirty.has(selected) && !state.saved[selected]
    ? presets.find(template => template.id === selected) ?? state.drafts[selected]
    : state.drafts[selected];
  const activeMode = draft.design ? mode : 'source';
  const preview = useMemo(() => {
    try { return { ...previewEmailTemplate(draft, { title: t('emailTemplates.sampleTitle'), message: t('emailTemplates.sampleMessage') }), error: '' }; }
    catch (err) { return { subject: '', html: '', text: '', error: err instanceof Error ? err.message : t('emailTemplates.invalid') }; }
  }, [draft, t]);
  const update = (changes: Partial<EmailTemplate>) => { dispatch({ type: 'edit', template: { ...draft, ...changes } }); setNotice(''); };
  const updateDesign = (changes: Partial<EmailTemplateDesign>) => {
    if (draft.design) dispatch({ type: 'edit', template: applyEmailDesign(draft, { ...draft.design, ...changes, mode: 'visual' }) });
    setNotice('');
  };
  const save = async () => {
    setBusy(true); setError(''); setNotice('');
    try { const saved = await emailTemplateApi.save(draft); dispatch({ type: 'saved', template: saved }); setNotice(t('emailTemplates.saved')); }
    catch (err) { setError(describeError(err)); }
    finally { setBusy(false); }
  };
  const exportTemplate = () => {
    const address = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = address; anchor.download = `${draft.id}.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(address), 0);
  };
  const designField = (key: keyof EmailTemplateDesign, multiline = false) => <TextField key={key} fullWidth size="small"
    disabled={busy || loading} label={t(`emailTemplates.fields.${key}`)} value={draft.design?.[key] ?? ''} multiline={multiline} minRows={multiline ? 2 : undefined}
    onChange={event => updateDesign({ [key]: event.target.value })} />;

  return <Stack spacing={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="h6">{t('emailTemplates.title')}</Typography><Typography variant="body2" color="text.secondary">{t('emailTemplates.description')}</Typography></Box>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Button onClick={exportTemplate} startIcon={<Download />}>{t('emailTemplates.export')}</Button>
        <Button variant="contained" startIcon={<Save />} onClick={() => void save()} disabled={busy || loading || !available || !!preview.error}>{t(busy ? 'emailTemplates.saving' : 'emailTemplates.save')}</Button>
      </Stack>
    </Stack>
    {error && <Alert severity={available ? 'error' : 'info'} action={<Button color="inherit" disabled={busy || loading} onClick={() => void load()}>{t('emailTemplates.reload')}</Button>}>{error}</Alert>}
    {notice && <Alert severity="success">{notice}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel id="email-template-select">{t('emailTemplates.choose')}</InputLabel>
        <Select labelId="email-template-select" label={t('emailTemplates.choose')} value={selected} disabled={busy}
          onChange={event => { setSelected(event.target.value); setNotice(''); }}>
          {Object.values(state.drafts).map(template => <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}
        </Select>
      </FormControl>
      <Chip size="small" variant="outlined" label={state.dirty.has(selected) ? t('emailTemplates.unsaved') : state.saved[selected] ? t('emailTemplates.stored') : t('emailTemplates.preset')} />
      <Button disabled={busy || loading} onClick={() => { dispatch({ type: 'restore', id: selected, preset: presets.find(preset => preset.id === selected) ?? draft }); setNotice(''); }}>{t('emailTemplates.restore')}</Button>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', xl: 'minmax(300px, .9fr) minmax(0, 1.1fr)' }, gap: 3, alignItems: 'start' }}>
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        <TextField size="small" label={t('emailTemplates.name')} value={draft.name} disabled={busy || loading} onChange={event => update({ name: event.target.value })} />
        <TextField size="small" label={t('emailTemplates.subject')} value={draft.subject} disabled={busy || loading} onChange={event => update({ subject: event.target.value })} />
        <Tabs value={activeMode} onChange={(_, mode: 'visual' | 'source') => setMode(mode)}><Tab value="visual" label={t('emailTemplates.visual')} disabled={!draft.design} /><Tab value="source" label={t('emailTemplates.source')} /></Tabs>
        {activeMode === 'visual' && draft.design ? <>
          {draft.design.mode === 'source' && <Alert severity="info">{t('emailTemplates.regenerate')}</Alert>}
          {designField('heading')}{designField('summary', true)}
          <Typography variant="caption" color="text.secondary">{t('emailTemplates.variables')}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 2 }}>{designField('category')}{designField('badge')}</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 2 }}>{(['color', 'tint', 'border'] as const).map(key => <TextField key={key} type="color" size="small" label={t(`emailTemplates.fields.${key}`)} disabled={busy || loading} value={draft.design![key]} onChange={event => updateDesign({ [key]: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />)}</Box>
          {designField('environment')}{designField('actionLabel')}{designField('actionURL')}{designField('reason', true)}{designField('footerNote', true)}{designField('footerVerse')}{designField('footerTagline')}
        </> : <>
          <Typography variant="caption" color="text.secondary">{t('emailTemplates.sourceHint')}</Typography>
          <TextField label="HTML" multiline minRows={18} maxRows={35} value={draft.html} disabled={busy || loading}
            onChange={event => update({ html: event.target.value, design: draft.design ? { ...draft.design, mode: 'source' } : undefined })}
            slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }} />
        </>}
        <TextField label={t('emailTemplates.text')} multiline minRows={4} maxRows={12} value={draft.text} disabled={busy || loading} onChange={event => update({ text: event.target.value })} />
      </Stack>
      <Stack spacing={1.5} sx={{ minWidth: 0, position: { xl: 'sticky' }, top: 76 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography variant="subtitle2">{t('emailTemplates.preview')}</Typography>
          <ToggleButtonGroup size="small" exclusive value={width} onChange={(_, value: number | null) => { if (value) setWidth(value); }} aria-label={t('emailTemplates.previewWidth')}>
            <ToggleButton value={600}>{t('emailTemplates.desktop')}</ToggleButton><ToggleButton value={360}>{t('emailTemplates.mobile')}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="caption" color="text.secondary">{t('emailTemplates.previewHint')}</Typography>
        {preview.error ? <Alert severity="error">{t('emailTemplates.invalid')}：{preview.error}</Alert> : <>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{preview.subject}</Typography>
          <Box sx={{ bgcolor: 'action.hover', p: 1, overflow: 'auto', borderRadius: 1 }}>
            <Box component="iframe" title={t('emailTemplates.preview')} sandbox="" referrerPolicy="no-referrer" srcDoc={sandboxEmailPreview(preview.html)}
              sx={{ display: 'block', width, maxWidth: '100%', height: 740, border: 0, mx: 'auto', bgcolor: '#eef2f7' }} />
          </Box>
        </>}
      </Stack>
    </Box>
  </Stack>;
}
