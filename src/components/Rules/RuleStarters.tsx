import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RuleCreateInput } from '../../services/rulesData';

const starters = [
  { key: 'path', category: '信息泄露', variable: 'REQUEST_URI', operator: 'matches', value: '(?i)/[.](env|git)(/|$)', action: 'block' },
  { key: 'scanner', category: '扫描器', variable: 'REQUEST_HEADERS:User-Agent', operator: 'matches', value: '(?i)(sqlmap|nikto|nmap)', action: 'log' },
  { key: 'parameter', category: '其他', variable: 'ARGS:debug', operator: 'eq', value: 'true', action: 'block' },
  { key: 'header', category: '其他', variable: 'REQUEST_HEADERS:X-Debug', operator: 'eq', value: 'true', action: 'log' },
] as const;

export function RuleStarters({ open, onClose, onChoose }: { open: boolean; onClose: () => void; onChoose: (input: RuleCreateInput) => void }) {
  const { t } = useTranslation();
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{t('ruleManagement.templates')}</DialogTitle>
    <DialogContent><Alert severity="info" sx={{ mb: 2 }}>{t('ruleManagement.starterHint')}</Alert><List disablePadding>{starters.map(starter => <ListItemButton key={starter.key} onClick={() => onChoose({ name: t(`ruleManagement.starters.${starter.key}`), type: '正则', phase: 'request', severity: 'medium', category: starter.category, action: starter.action, conditions: [{ variable: starter.variable, operator: starter.operator, value: starter.value }] })}>
      <ListItemText primary={t(`ruleManagement.starters.${starter.key}`)} secondary={`${starter.variable} ${starter.operator} ${starter.value}`} slotProps={{ secondary: { sx: { fontFamily: 'monospace', fontSize: 12 } } }} />
    </ListItemButton>)}</List></DialogContent>
    <DialogActions><Button onClick={onClose}>{t('common.close')}</Button></DialogActions>
  </Dialog>;
}
