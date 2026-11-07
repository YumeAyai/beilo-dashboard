import { Chip } from '@mui/material';
import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { getThreatCategoryColors, normalizeThreatCategory, threatCategoryKeys } from '../../utils/threatCategory';

interface ChipColorConfig {
  labelKey?: string;
  color: { light: string; dark: string };
}

interface ChipTypeConfig {
  [key: string]: ChipColorConfig;
}

// All chip configurations in one place
const chipConfigs: Record<string, ChipTypeConfig> = {
  // Status types
  status: {
    healthy: { labelKey: 'dashboard.clusterStatus.healthy', color: colors.success },
    degraded: { labelKey: 'dashboard.clusterStatus.degraded', color: colors.warning },
    down: { labelKey: 'dashboard.clusterStatus.down', color: colors.error },
    unknown: { labelKey: 'dashboard.clusterStatus.unknown', color: { light: '#86909C', dark: '#A6A6A6' } },
    enabled: { labelKey: 'status.enabled', color: colors.success },
    disabled: { labelKey: 'status.disabled', color: { light: '#717780', dark: '#A6A6A6' } },
    blocked: { labelKey: 'status.blocked', color: colors.error },
    detected: { labelKey: 'status.detected', color: colors.warning },
    suspicious: { labelKey: 'status.suspicious', color: colors.warning },
    logged: { labelKey: 'status.logged', color: colors.info },
    allowed: { labelKey: 'status.allowed', color: colors.success },
    unknown_action: { labelKey: 'status.unknown', color: { light: '#86909C', dark: '#A6A6A6' } },
    pending: { labelKey: 'status.processing', color: colors.warning },
    online: { labelKey: 'status.online', color: colors.success },
    offline: { labelKey: 'status.offline', color: { light: '#717780', dark: '#A6A6A6' } },
    connected: { labelKey: 'status.connected', color: colors.success },
    notConnected: { labelKey: 'status.notConnected', color: colors.error },
    active: { labelKey: 'status.active', color: colors.success },
    inactive: { labelKey: 'status.inactive', color: { light: '#717780', dark: '#A6A6A6' } },
    success: { labelKey: 'status.success', color: colors.success },
    error: { labelKey: 'status.error', color: colors.error },
    warning: { labelKey: 'status.warning', color: colors.warning },
    banned: { labelKey: 'status.banned', color: colors.error },
    monitoring: { labelKey: 'status.monitoring', color: colors.info },
  },

  // Severity types
  severity: {
    critical: { labelKey: 'threatLevel.critical', color: colors.severity.critical },
    high: { labelKey: 'threatLevel.high', color: colors.severity.high },
    medium: { labelKey: 'threatLevel.medium', color: colors.severity.medium },
    low: { labelKey: 'threatLevel.low', color: colors.severity.low },
    info: { labelKey: 'threatLevel.info', color: colors.severity.info },
  },

  // Log levels are separate from threat severity names.
  logLevel: {
    trace: { color: { light: '#86909C', dark: '#A6A6A6' } },
    debug: { color: { light: '#86909C', dark: '#A6A6A6' } },
    info: { color: colors.info },
    warn: { color: colors.warning },
    warning: { color: colors.warning },
    error: { color: colors.error },
    critical: { color: colors.error },
    fatal: { color: colors.error },
  },

  // Action types
  action: {
    block: { labelKey: 'ruleAction.block', color: colors.error },
    allow: { labelKey: 'ruleAction.allow', color: colors.success },
    pass: { labelKey: 'ruleAction.skip', color: colors.warning },
    skip: { labelKey: 'ruleAction.skip', color: colors.warning },
    log: { labelKey: 'ruleAction.log', color: colors.info },
    redirect: { labelKey: 'ruleAction.redirect', color: { light: '#722ED1', dark: '#BA68C8' } },
    drop: { labelKey: 'ruleAction.drop', color: colors.error },
    status: { labelKey: 'ruleAction.returnStatus', color: colors.info },
  },

  // Attack types
  attack: Object.fromEntries(Object.entries(threatCategoryKeys).map(([id, labelKey]) => [id, { labelKey, color: getThreatCategoryColors(id) }])) ,

  // Category types (Chinese)
  category: {
    'SQL注入': { color: colors.attack.sqlInjection },
    'XSS': { color: colors.attack.xss },
    '命令注入': { color: colors.attack.commandInjection },
    '路径遍历': { color: colors.attack.pathTraversal },
    '扫描器': { color: colors.attack.scanner },
    '信息泄露': { color: colors.attack.bruteForce },
  },

  // Node types
  nodeType: {
    ingress: { labelKey: 'nodeType.entry', color: colors.nodeType.ingress },
    egress: { labelKey: 'nodeType.exit', color: colors.nodeType.egress },
    internal: { labelKey: 'nodeType.internal', color: colors.nodeType.internal },
    external: { labelKey: 'nodeType.external', color: colors.nodeType.external },
  },
};

// Get background color from main color
function getBgColor(color: string): string {
  return color + '15';
}

export interface CommonChipProps {
  type: 'status' | 'severity' | 'logLevel' | 'action' | 'attack' | 'category' | 'nodeType';
  value: string;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  label?: string;
  sx?: object;
}

export function CommonChip({ type, value, size = 'small', variant = 'filled', label, sx = {} }: CommonChipProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const config = chipConfigs[type]?.[type === 'attack' ? normalizeThreatCategory(value) : value];
  const defaultColor = { light: '#86909C', dark: '#A6A6A6' };

  const color = config?.color
    ? (isDark ? config.color.dark : config.color.light)
    : defaultColor.light;

  const displayLabel = label || (config?.labelKey ? t(config.labelKey) : value);

  const bgColor = variant === 'filled'
    ? (isDark ? color + '30' : getBgColor(color))
    : 'transparent';

  return (
    <Chip
      label={displayLabel}
      size={size}
      variant={variant}
      sx={{
        bgcolor: bgColor,
        color: color,
        fontWeight: 500,
        borderRadius: 1.5,
        border: variant === 'outlined' ? `1px solid ${color}50` : 'none',
        ...sx,
      }}
    />
  );
}

// Backwards compatibility exports
export function StatusChip({ status, size, variant }: Omit<CommonChipProps, 'type' | 'value' | 'label'> & { status: string }) {
  return <CommonChip type="status" value={status} size={size} variant={variant} />;
}

export function SeverityChip({ severity, size, filled }: Omit<CommonChipProps, 'type' | 'value' | 'label' | 'variant'> & { severity: string; filled?: boolean }) {
  return (
    <CommonChip
      type="severity"
      value={severity}
      size={size}
      variant={filled ? 'outlined' : 'filled'}
      sx={filled ? { bgcolor: 'transparent', border: `1px solid currentColor` } : {}}
    />
  );
}

export function ActionChip({ action, size }: Omit<CommonChipProps, 'type' | 'value' | 'label'> & { action: string }) {
  return <CommonChip type="action" value={action} size={size} />;
}

export function CategoryChip({ category, size, sx }: Omit<CommonChipProps, 'type' | 'value' | 'label'> & { category: string }) {
  return <CommonChip type="category" value={category} size={size} sx={sx} />;
}

export function AttackTypeChip({ attackType, size }: Omit<CommonChipProps, 'type' | 'value' | 'label'> & { attackType: string }) {
  return <CommonChip type="attack" value={attackType} size={size} />;
}

export function NodeTypeChip({ nodeType, size }: Omit<CommonChipProps, 'type' | 'value' | 'label'> & { nodeType: string }) {
  return <CommonChip type="nodeType" value={nodeType} size={size} />;
}
