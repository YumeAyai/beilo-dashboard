import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Checkbox, IconButton, Tooltip, Typography, LinearProgress, Chip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Rule as RuleIcon, Schedule as ScheduleIcon, Science as ScienceIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import type { Rule, RuleQueryParams } from '../../services/rulesData';
import type { TFunction } from 'i18next';
import { StatusChip, SeverityChip, ActionChip, CategoryChip } from '../Common/StatusChip';
import { colors } from '../../theme/colors';
import { formatTime } from './helpers';

interface RulesTableProps {
  rules: Rule[];
  total: number;
  loading: boolean;
  disabled?: boolean;
  params: RuleQueryParams;
  selectedIds: string[];
  onSelectAll: (selected: boolean) => void;
  onSelect: (id: string) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
  onTest: (rule: Rule) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (pageSize: number) => void;
  t: TFunction;
}

export function RulesTable({
  rules,
  total,
  loading,
  disabled = false,
  params,
  selectedIds,
  onSelectAll,
  onSelect,
  onEdit,
  onDelete,
  onTest,
  onPageChange,
  onRowsPerPageChange,
  t,
}: RulesTableProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isAllSelected = rules.length > 0 && rules.every(rule => selectedIds.includes(rule.id));
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < rules.length;

  return (
    <TableContainer>
      {loading && <LinearProgress />}
      <Table stickyHeader>
        <TableHead>
          <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#F7F8FA' }}>
            <TableCell padding="checkbox" sx={{ width: 48, borderBottom: 'none' }}>
              <Checkbox
                size="small"
                disabled={disabled}
                indeterminate={isIndeterminate}
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('rules.table.name')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('rules.table.category')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('rules.table.level')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('rules.table.action')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('ruleManagement.target')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('ruleManagement.enabled')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('ruleManagement.deployment')}</TableCell>
            <TableCell sx={{ borderBottom: 'none', py: 1.5 }}>{t('rules.table.lastMatch')}</TableCell>
            <TableCell align="right" sx={{ borderBottom: 'none', py: 1.5 }}>{t('rules.table.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell padding="checkbox"><Checkbox disabled /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: '60%' }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 40 }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 40 }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 40 }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 40 }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 40 }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 60 }} /></TableCell>
                <TableCell><Box sx={{ height: 24, bgcolor: isDark ? '#333' : '#f0f0f0', borderRadius: 1, width: 60 }} /></TableCell>
                <TableCell />
              </TableRow>
            ))
          ) : rules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <RuleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">{t('rules.messages.noRules')}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => (
              <TableRow
                key={rule.id}
                hover
                selected={selectedIds.includes(rule.id)}
                sx={{
                  '&.Mui-selected': { bgcolor: colors.primary.main + '08' },
                  '&:hover': { bgcolor: isDark ? 'background.paper' : '#F7F8FA' },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    disabled={disabled}
                    checked={selectedIds.includes(rule.id)}
                    onChange={() => onSelect(rule.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="500">{rule.name}</Typography>
                    {rule.description && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                        {rule.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell><CategoryChip category={rule.category} /></TableCell>
                <TableCell><SeverityChip severity={rule.severity} /></TableCell>
                <TableCell><ActionChip action={rule.action} /></TableCell>
                <TableCell><Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{rule.targetGateway ? 'Gateway' : rule.targetIngress ? 'Ingress' : ''}</Typography><Typography variant="caption" color="text.secondary">{rule.targetGateway || rule.targetIngress ? `${rule.targetNamespace || 'default'}/${rule.targetGateway || rule.targetIngress}` : t('ruleManagement.noTarget')}</Typography></TableCell>
                <TableCell><StatusChip status={rule.enabled ? 'enabled' : 'disabled'} /></TableCell>
                <TableCell>
                  <Tooltip title={rule.deployment?.reason || t('ruleManagement.deploymentHint')}>
                    <Chip size="small" variant="outlined" label={t(`ruleManagement.states.${rule.deployment?.state || 'unknown'}`)} color={rule.deployment?.state === 'observed' ? 'info' : rule.deployment?.state === 'error' || rule.deployment?.state === 'blocked' ? 'warning' : 'default'} />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(rule.stats?.lastMatched, t)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('rules.toolbar.edit')}>
                    <IconButton disabled={disabled} size="small" onClick={() => onEdit(rule)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('rules.toolbar.test')}>
                    <IconButton disabled={disabled} size="small" onClick={() => onTest(rule)}><ScienceIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('rules.toolbar.delete')}>
                    <IconButton disabled={disabled} size="small" color="error" onClick={() => onDelete(rule.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={params.pageSize || 25}
        page={(params.page || 1) - 1}
        onPageChange={(_, page) => onPageChange(page + 1)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value))}
        labelRowsPerPage={t('rules.pagination.rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) => t('rules.pagination.displayRows', { from, to, count })}
      />
    </TableContainer>
  );
}
