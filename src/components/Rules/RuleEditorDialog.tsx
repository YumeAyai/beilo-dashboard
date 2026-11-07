import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, Select, MenuItem,
  Grid, Box, Avatar, Alert, Divider, Paper, IconButton, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import type { Rule, RuleCreateInput, RuleType, RulePhase, RuleAction, ThreatLevel, IngressInfo } from '../../services/rulesData';
import type { GatewayInfo } from '../../services/api';
import { colors } from '../../theme/colors';
import type { TFunction } from 'i18next';

interface RuleEditorDialogProps {
  open: boolean;
  rule: Rule | null;
  ingresses: IngressInfo[];
  gateways?: GatewayInfo[];
  initial?: RuleCreateInput;
  saving?: boolean;
  targetError?: boolean;
  onClose: () => void;
  onSave: (rule: RuleCreateInput) => void;
  t: TFunction;
}

export function RuleEditorDialog({ open, rule, ingresses, gateways = [], initial, saving = false, targetError = false, onClose, onSave, t }: RuleEditorDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [formData, setFormData] = useState<RuleCreateInput>(() => {
    if (rule) {
      return {
        name: rule.name,
        description: rule.description || '',
        type: rule.type,
        phase: rule.phase || 'request',
        action: rule.action,
        severity: rule.severity,
        category: rule.category,
        conditions: rule.conditions || [],
        tags: rule.metadata?.tags || [],
        transformations: rule.transformations,
        targetGateway: rule.targetGateway || '',
        targetIngress: rule.targetIngress || '',
        targetNamespace: rule.targetNamespace || '',
      };
    }
    if (initial) return initial;
    return {
      name: '',
      description: '',
      type: '正则',
      phase: 'request',
      action: 'block',
      severity: 'high',
      category: '',
      conditions: [],
      tags: [],
      targetIngress: '',
      targetNamespace: '',
    };
  });

  const [error, setError] = useState<string | null>(null);

  const handleAddCondition = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { operator: 'matches', variable: 'REQUEST_URI', value: '' }],
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateCondition = (index: number, field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError(t('rules.messages.nameRequired'));
      return;
    }
    if (formData.conditions.length === 0) {
      setError(t('rules.messages.conditionRequired'));
      return;
    }
    if (formData.conditions.some(condition => !condition.variable.trim())) {
      setError(t('ruleManagement.invalidValue')); return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: rule ? colors.dialog.edit.bg : colors.dialog.create.bg }}>
            {rule ? (
              <EditIcon sx={{ color: colors.dialog.edit.color }} />
            ) : (
              <AddIcon sx={{ color: colors.dialog.create.color }} />
            )}
          </Avatar>
          <Box>
            <Box sx={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
              {rule ? t('rules.editor.editTitle') : t('rules.editor.createTitle')}
            </Box>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {rule ? t('rules.subtitle') : t('rules.editor.createTitle')}
            </Box>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: isDark ? colors.dialogBorder.dark : colors.dialogBorder.light }}>
        {targetError && <Alert severity="warning" sx={{ mb: 2 }}>{t('ruleManagement.targetError')}</Alert>}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label={t('rules.editor.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label={t('rules.editor.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <Box component="label">{t('rules.editor.ruleType')}</Box>
              <Select
                value={formData.type}
                label={t('rules.editor.ruleType')}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as RuleType })}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="正则">{t('rules.editor.regex')}</MenuItem>
                <MenuItem value="字符串">{t('rules.editor.stringMatch')}</MenuItem>
                <MenuItem value="变量">{t('rules.editor.variableCompare')}</MenuItem>
                <MenuItem value="条件">{t('rules.editor.conditionGroup')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <Box component="label">{t('rules.editor.phase')}</Box>
              <Select
                value={formData.phase}
                label={t('rules.editor.phase')}
                onChange={(e) => setFormData({ ...formData, phase: e.target.value as RulePhase })}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="early">{t('rules.editor.earlyPhase')}</MenuItem>
                <MenuItem value="request">{t('rules.editor.requestPhase')}</MenuItem>
                <MenuItem value="response">{t('rules.editor.responsePhase')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <Box component="label">{t('ruleManagement.action')}</Box>
              <Select
                value={formData.action}
                label={t('ruleManagement.action')}
                onChange={(e) => setFormData({ ...formData, action: e.target.value as RuleAction })}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="block">{t('rules.action.block')}</MenuItem>
                <MenuItem value="allow">{t('rules.action.allow')}</MenuItem>
                <MenuItem value="pass">{t('rules.action.pass')}</MenuItem>
                <MenuItem value="log">{t('rules.action.log')}</MenuItem>
                <MenuItem value="drop">{t('rules.action.drop')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <Box component="label">{t('rules.editor.threatLevel')}</Box>
              <Select
                value={formData.severity}
                label={t('rules.editor.threatLevel')}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as ThreatLevel })}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="critical">{t('threatLevel.critical')}</MenuItem>
                <MenuItem value="high">{t('threatLevel.high')}</MenuItem>
                <MenuItem value="medium">{t('threatLevel.medium')}</MenuItem>
                <MenuItem value="low">{t('threatLevel.low')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label={t('common.category')}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder={t('rules.category.placeholder')}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <Box component="label" sx={{ mb: 0.5 }}>{t('ruleManagement.target')}</Box>
              <Select
                value={formData.targetNamespace && (formData.targetIngress || formData.targetGateway) ? `${formData.targetGateway ? 'Gateway' : 'Ingress'}/${formData.targetNamespace}/${formData.targetGateway || formData.targetIngress}` : ''}
                onChange={event => {
                  const [kind, namespace, name] = event.target.value.split('/');
                  setFormData({ ...formData, targetNamespace: namespace || '', targetIngress: kind === 'Ingress' ? name : '', targetGateway: kind === 'Gateway' ? name : '' });
                }}
                displayEmpty
              >
                <MenuItem value=""><em>{t('ruleManagement.noTarget')}</em></MenuItem>
                {formData.targetIngress && !ingresses.some(item => item.namespace === formData.targetNamespace && item.name === formData.targetIngress) && <MenuItem value={`Ingress/${formData.targetNamespace}/${formData.targetIngress}`}>Ingress · {formData.targetNamespace}/{formData.targetIngress}</MenuItem>}
                {formData.targetGateway && !gateways.some(item => item.namespace === formData.targetNamespace && item.name === formData.targetGateway) && <MenuItem value={`Gateway/${formData.targetNamespace}/${formData.targetGateway}`}>Gateway · {formData.targetNamespace}/{formData.targetGateway}</MenuItem>}
                {ingresses.map(item => <MenuItem key={`Ingress/${item.namespace}/${item.name}`} value={`Ingress/${item.namespace}/${item.name}`}>Ingress · {item.namespace}/{item.name}</MenuItem>)}
                {gateways.map(item => <MenuItem disabled={!item.bindable} key={`Gateway/${item.namespace}/${item.name}`} value={`Gateway/${item.namespace}/${item.name}`}>Gateway · {item.namespace}/{item.name}{!item.bindable ? ` (${item.reason || 'unavailable'})` : ''}</MenuItem>)}
              </Select>
              <Box sx={{ mt: 1, color: 'text.secondary', fontSize: 12 }}>{t('ruleManagement.targetHint')}</Box>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ fontSize: '1rem', fontWeight: 'bold' }}>{t('rules.editor.conditions')}</Box>
          <Button startIcon={<AddIcon />} onClick={handleAddCondition} size="small" variant="outlined" sx={{ borderRadius: 2 }}>
            {t('rules.editor.addCondition')}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>{t('ruleManagement.conditionsHint')}</Alert>
        {formData.conditions.map((condition, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              mb: 2,
              bgcolor: isDark ? colors.conditionCard.bg.dark : colors.conditionCard.bg.light,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 3 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={['REQUEST_URI', 'REQUEST_URI_RAW', 'REQUEST_METHOD', 'REQUEST_BODY', 'REQUEST_HEADERS', 'REQUEST_HEADERS:User-Agent', 'ARGS', 'ARGS_NAMES', 'REMOTE_ADDR', 'REQUEST_COOKIES', 'RESPONSE_HEADERS', 'RESPONSE_BODY']}
                  value={condition.variable}
                  onInputChange={(_, value) => handleUpdateCondition(index, 'variable', value)}
                  renderInput={params => <TextField {...params} label={t('rules.condition.variable')} placeholder="ARGS:name" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <FormControl fullWidth size="small">
                  <Select
                    value={condition.operator}
                    onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
                    sx={{ bgcolor: isDark ? colors.conditionCard.input.dark : colors.conditionCard.input.light, borderRadius: 2 }}
                  >
                    <MenuItem value="matches">{t('rules.condition.match')}</MenuItem>
                    <MenuItem value="contains">{t('rules.condition.contains')}</MenuItem>
                    <MenuItem value="eq">{t('rules.condition.equals')}</MenuItem>
                    <MenuItem value="startsWith">{t('rules.condition.startsWith')}</MenuItem>
                    <MenuItem value="endsWith">{t('rules.condition.endsWith')}</MenuItem>
                    <MenuItem value="regex">{t('rules.condition.regex')}</MenuItem>
                    <MenuItem value="ne">≠</MenuItem><MenuItem value="gt">&gt;</MenuItem><MenuItem value="lt">&lt;</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 10, sm: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('rules.condition.placeholder')}
                  value={condition.value}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                  sx={{ bgcolor: isDark ? colors.conditionCard.input.dark : colors.conditionCard.input.light, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid size={{ xs: 2, sm: 2 }} sx={{ textAlign: 'right' }}>
                <IconButton size="small" color="error" onClick={() => handleRemoveCondition(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}

        {formData.conditions.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              bgcolor: isDark ? 'background.paper' : '#F7F8FA',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ color: 'text.secondary', mb: 1 }}>{t('rules.editor.noConditions')}</Box>
            <Button startIcon={<AddIcon />} onClick={handleAddCondition} sx={{ mt: 1 }}>
              {t('rules.condition.addFirst')}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ borderRadius: 2 }}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ borderRadius: 2, px: 3 }}>
          {saving ? t('ruleManagement.pending') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
