import { Avatar, Box, Card, CardContent, Typography, Tooltip, useTheme } from '@mui/material';
import { Shield, Block } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { ProtectionCounters } from '../types/observability';
import { colors } from '../theme/colors';
import { summaryCardSx, summaryCardContentSx, summaryMetricsSx } from './Common/summaryCardStyles';

const groups = [
  { key: 'runtimeBlocked', layer: 'runtime', unit: 'actions', Icon: Shield, color: 'warning' },
  { key: 'wafBlocked', layer: 'waf', unit: 'requests', Icon: Block, color: 'error' },
] as const;

export function ProtectionCountersCard({ counters }: { counters?: ProtectionCounters }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const mode = theme.palette.mode;
  return <Card sx={summaryCardSx}>
    <CardContent sx={summaryCardContentSx}>
      <Typography variant="body2" sx={{ color: mode === 'dark' ? '#ffffff' : '#1D2129', fontWeight: 600, mb: 1.5 }}>
        {t('dashboard.stats.threatBlock')}
      </Typography>
      <Box sx={summaryMetricsSx}>
        {groups.map(({ key, layer, unit, Icon, color }) => {
          const counter = counters?.[layer];
          const available = counter?.status.unit === unit && counter.status.state === 'available'
            && counter.count !== null && Number.isFinite(counter.count) && counter.count >= 0;
          const value = available ? counter.count!.toLocaleString() : '—';
          return <Tooltip key={key} describeChild
            title={<Box sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6 }}>{t(`dashboard.protection.${key}Hint`)}</Typography>
              {!available && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{t('dashboard.protection.blockCountUnavailable')}</Typography>}
            </Box>}
            placement="right" arrow
            slotProps={{ tooltip: { sx: { maxWidth: 400, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 8, border: '1px solid', borderColor: 'divider' } } }}>
            <Box tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, cursor: 'help' }}>
              <Avatar sx={{ bgcolor: colors.statCard[color].bg[mode], width: 36, height: 36 }}><Icon sx={{ color: colors.statCard[color].color[mode], fontSize: 20 }} /></Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">{t(`dashboard.protection.${key}`)}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: colors.statCard[color].color[mode] }}>{value}</Typography>
              </Box>
            </Box>
          </Tooltip>;
        })}
      </Box>
    </CardContent>
  </Card>;
}
