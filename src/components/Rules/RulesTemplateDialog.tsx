import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, Box, Avatar,
} from '@mui/material';
import { Science as ScienceIcon } from '@mui/icons-material';
import { TemplateCard } from './TemplateCard';
import { colors } from '../../theme/colors';
import type { RuleTemplate, RuleCreateInput } from '../../services/rulesData';
import type { TFunction } from 'i18next';

interface RulesTemplateDialogProps {
  open: boolean;
  templates: RuleTemplate[];
  onClose: () => void;
  onApply: (ruleData: RuleCreateInput) => void;
  t: TFunction;
}

export function RulesTemplateDialog({ open, templates, onClose, onApply, t }: RulesTemplateDialogProps) {
  const handleApply = (templateId: string) => {
    const template = templates.find((tm) => tm.id === templateId);
    if (!template) return;
    onApply({
      name: template.rule.name,
      description: template.rule.description,
      type: template.rule.type,
      phase: template.rule.phase,
      action: template.rule.action,
      severity: template.rule.severity,
      category: template.rule.category,
      conditions: template.rule.conditions,
      tags: template.tags,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
            <ScienceIcon sx={{ color: colors.primary.main }} />
          </Avatar>
          <Box>
            <Box sx={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{t('rules.template.title')}</Box>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{t('rules.template.subtitle')}</Box>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {templates.map((template) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
              <TemplateCard template={template} onApply={handleApply} t={t} />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('rules.template.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
