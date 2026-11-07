import { Box, TextField, FormControl, Select, MenuItem, IconButton, Tooltip, InputAdornment } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import type { RuleQueryParams, ThreatLevel, IngressInfo } from '../../services/rulesData';
import type { GatewayInfo } from '../../services/api';
import type { TFunction } from 'i18next';

interface RulesToolbarProps {
  search: string;
  params: RuleQueryParams;
  loading: boolean;
  ingresses: IngressInfo[];
  gateways?: GatewayInfo[];
  onSearch: (value: string) => void;
  onParamsChange: (params: RuleQueryParams) => void;
  onRefresh: () => void;
  t: TFunction;
}

export function RulesToolbar({
  search,
  params,
  loading,
  ingresses,
  gateways = [],
  onSearch,
  onParamsChange,
  onRefresh,
  t,
}: RulesToolbarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleCategoryChange = (value: string) => {
    onParamsChange({ ...params, category: value, page: 1 });
  };

  const handleSeverityChange = (value: string) => {
    onParamsChange({ ...params, severity: value as ThreatLevel, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    onParamsChange({ ...params, status: value as 'enabled' | 'disabled' | 'testing', page: 1 });
  };

  const handleIngressChange = (value: string) => {
    if (value) {
      const [kind, ns, name] = value.split('/');
      onParamsChange({ ...params, namespace: ns, ingress: kind === 'Ingress' ? name : undefined, gateway: kind === 'Gateway' ? name : undefined, page: 1 });
    } else {
      onParamsChange({ ...params, namespace: undefined, ingress: undefined, gateway: undefined, page: 1 });
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField
        size="small"
        placeholder={t('rules.searchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          minWidth: 200,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: isDark ? 'background.paper' : '#F7F8FA',
            '&:hover': { bgcolor: isDark ? '#333' : '#F2F3F5' },
            '&.Mui-focused': { bgcolor: isDark ? 'background.default' : '#fff' },
          },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={params.namespace && (params.ingress || params.gateway) ? `${params.gateway ? 'Gateway' : 'Ingress'}/${params.namespace}/${params.gateway || params.ingress}` : ''}
          displayEmpty
          onChange={(e) => handleIngressChange(e.target.value as string)}
          sx={{ borderRadius: 2 }}
        >
          <MenuItem value="">{t('ruleManagement.allTargets')}</MenuItem>
          {gateways.map(gateway => <MenuItem key={`Gateway/${gateway.namespace}/${gateway.name}`} value={`Gateway/${gateway.namespace}/${gateway.name}`}>Gateway · {gateway.namespace}/{gateway.name}</MenuItem>)}
          {ingresses.map((ing) => (
            <MenuItem key={`${ing.namespace}/${ing.name}`} value={`Ingress/${ing.namespace}/${ing.name}`}>
              Ingress · {ing.namespace}/{ing.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={params.category || ''}
          displayEmpty
          onChange={(e) => handleCategoryChange(e.target.value)}
          sx={{ borderRadius: 2 }}
        >
          <MenuItem value="">{t('rules.filter.allCategory')}</MenuItem>
          <MenuItem value="SQL注入">{t('attackType.sqlInjection')}</MenuItem>
          <MenuItem value="XSS">{t('attackType.xss')}</MenuItem>
          <MenuItem value="命令注入">{t('attackType.commandInjection')}</MenuItem>
          <MenuItem value="路径遍历">{t('attackType.pathTraversal')}</MenuItem>
          <MenuItem value="扫描器">{t('attackType.scanner')}</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={params.severity || ''}
          displayEmpty
          onChange={(e) => handleSeverityChange(e.target.value as string)}
          sx={{ borderRadius: 2 }}
        >
          <MenuItem value="">{t('rules.filter.allLevel')}</MenuItem>
          <MenuItem value="critical">{t('rules.filter.critical')}</MenuItem>
          <MenuItem value="high">{t('rules.filter.high')}</MenuItem>
          <MenuItem value="medium">{t('rules.filter.medium')}</MenuItem>
          <MenuItem value="low">{t('rules.filter.low')}</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={params.status || ''}
          displayEmpty
          onChange={(e) => handleStatusChange(e.target.value as string)}
          sx={{ borderRadius: 2 }}
        >
          <MenuItem value="">{t('rules.filter.allStatus')}</MenuItem>
          <MenuItem value="enabled">{t('rules.filter.enabled')}</MenuItem>
          <MenuItem value="disabled">{t('rules.filter.disabled')}</MenuItem>
        </Select>
      </FormControl>
      <Tooltip title={t('rules.toolbar.refresh')}>
        <IconButton onClick={onRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
