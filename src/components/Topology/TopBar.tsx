import { HubbleIcon, HubbleChevronDown } from './HubbleIcon';
import { Autocomplete, Box, Button, FormControl, IconButton, InputAdornment, Menu, MenuItem, Select, TextField, Tooltip, useTheme } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConnectionState } from './ConnectionIndicator';
import { ConnectionIndicator } from './ConnectionIndicator';
import { FlowsFilterInput } from './FlowsFilterInput';
import type { FlowFilter } from './flowFilters';

interface TopBarProps {
  namespaceFilter: string;
  allNamespaces: string[];
  onNamespaceChange: (ns: string) => void;
  flowFilters: FlowFilter[];
  filterSuggestions: string[];
  onFiltersChange: (filters: FlowFilter[]) => void;
  verdictFilter: string;
  onVerdictChange: (v: string) => void;
  httpStatus?: string;
  onHttpStatusChange?: (v: string) => void;
  stats: {
    flowsPerSec: number;
    nodesConnected: number;
    totalNodes: number;
  } | null;
  connectionState?: ConnectionState;
  onRefresh: () => void;
  loading: boolean;
  showHost?: boolean;
  onShowHostToggle?: () => void;
  showKubeDns?: boolean;
  onShowKubeDnsToggle?: () => void;
  showRemoteNode?: boolean;
  onShowRemoteNodeToggle?: () => void;
  showPrometheusApp?: boolean;
  onShowPrometheusAppToggle?: () => void;
  flowsDiffCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  namespaceFilter,
  allNamespaces,
  onNamespaceChange,
  flowFilters,
  filterSuggestions,
  onFiltersChange,
  verdictFilter,
  onVerdictChange,
  httpStatus = '',
  onHttpStatusChange,
  stats,
  connectionState = 'idle',
  onRefresh,
  loading,
  showHost = false,
  onShowHostToggle,
  showKubeDns = false,
  onShowKubeDnsToggle,
  showRemoteNode = false,
  onShowRemoteNodeToggle,
  showPrometheusApp = false,
  onShowPrometheusAppToggle,
  flowsDiffCount = 0,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [visualAnchor, setVisualAnchor] = useState<HTMLElement | null>(null);
  const filters = [
    ['Hide host service', showHost, onShowHostToggle],
    ['Hide kube-dns:53 pod', showKubeDns, onShowKubeDnsToggle],
    ['Hide remote node', showRemoteNode, onShowRemoteNodeToggle],
    ['Hide prometheus app', showPrometheusApp, onShowPrometheusAppToggle],
  ] as const;
  const activeFilterCount = filters.filter(([, shown]) => !shown).length;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: '7px', bgcolor: isDark ? '#202b33' : '#fff', border: '1px solid', borderColor: 'divider', gap: '6px', flexWrap: 'wrap', minWidth: 0,
      '& .MuiInputBase-root': { minHeight: 30, fontSize: 13, borderRadius: '3px' }, '& .MuiOutlinedInput-input': { py: 0.5 }, '& .MuiButton-root': { textTransform: 'none', fontSize: 13, height: 30, color: '#394b59' } }}>
      <Autocomplete disableClearable size="small" options={allNamespaces} value={namespaceFilter}
        getOptionLabel={ns => ns === 'all' ? t('topology.allNamespaces') : ns}
        onChange={(_, ns) => onNamespaceChange(ns)}
        openText={t('topology.filters.open')} closeText={t('common.close')} noOptionsText={t('topology.filters.noNamespaces')}
        popupIcon={<HubbleChevronDown />} sx={{ width: 160 }}
        renderInput={params => <TextField {...params} placeholder={t('topology.filters.findNamespace')}
          slotProps={{ htmlInput: { ...params.inputProps, 'aria-label': t('topology.filters.namespace') },
            input: { ...params.InputProps, startAdornment: <InputAdornment position="start"><HubbleIcon name="namespace" /></InputAdornment> } }} />}
      />
      <FlowsFilterInput filters={flowFilters} suggestions={filterSuggestions} onChange={onFiltersChange} />
      <Button aria-haspopup="menu" aria-expanded={!!visualAnchor} startIcon={<HubbleIcon name="visual-filters" sx={{ color: activeFilterCount ? '#137cbd' : 'inherit' }} />} endIcon={<HubbleChevronDown />} onClick={e => setVisualAnchor(e.currentTarget)}>Visual</Button>
      <Menu anchorEl={visualAnchor} open={!!visualAnchor} onClose={() => setVisualAnchor(null)}>
        {filters.map(([label, shown, toggle]) => <MenuItem key={label} dense onClick={() => toggle?.()} sx={{ fontSize: 14 }}>
          <input type="checkbox" checked={!shown} readOnly aria-label={label} style={{ marginRight: 8, accentColor: '#137cbd' }} />{label}
        </MenuItem>)}
      </Menu>
      <FormControl size="small" sx={{ width: 100 }}>
        <Select aria-label="Verdict" IconComponent={HubbleChevronDown} startAdornment={<InputAdornment position="start"><HubbleIcon name="verdict-filters" /></InputAdornment>} value={verdictFilter} onChange={e => onVerdictChange(e.target.value)}>
          {['all', 'forwarded', 'dropped', 'denied', 'audit'].map(v => <MenuItem key={v} value={v}>{v === 'all' ? 'Verdict' : t(`topology.verdict.${v}`)}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField size="small" placeholder="HTTP Status" value={httpStatus} onChange={e => onHttpStatusChange?.(e.target.value)} sx={{ width: 80 }} />
      <Tooltip title={t('rules.toolbar.refresh')}><span><IconButton aria-label={t('rules.toolbar.refresh')} onClick={onRefresh} disabled={loading} size="small"><HubbleIcon name="refresh" sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
      <Box sx={{ ml: 'auto' }}><ConnectionIndicator state={connectionState} flowsPerSec={stats?.flowsPerSec} nodesConnected={stats?.nodesConnected} totalNodes={stats?.totalNodes} isDark={isDark} flowsDiffCount={flowsDiffCount} /></Box>
    </Box>
  );
};
