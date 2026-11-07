import { useEffect, useState } from 'react';
import { Alert, Grid, MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { emailTemplateApi } from '../../services/emailTemplates';
import type { EmailTemplate } from '../../email/templates';

export function EmailTemplateSelector({ config, onChange }: { config: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [error, setError] = useState(false);
  const selected = config.useTemplate === false ? '' : String(config.templateID ?? '');
  useEffect(() => {
    let active = true;
    emailTemplateApi.list().then(templates => { if (active) setTemplates(templates); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return <>
    <Grid size={12}><TextField select fullWidth label={t('emailTemplates.channelTemplate')} value={selected}
      helperText={t('emailTemplates.channelHint')}
      onChange={event => { onChange('templateID', event.target.value); onChange('useTemplate', !!event.target.value); }}>
      <MenuItem value="">{t('emailTemplates.plainText')}</MenuItem>
      {selected && !templates.some(template => template.id === selected) && <MenuItem value={selected}>{selected}</MenuItem>}
      {templates.map(template => <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}
    </TextField></Grid>
    {error && <Grid size={12}><Alert severity="info">{t('emailTemplates.selectorUnavailable')}</Alert></Grid>}
  </>;
}
