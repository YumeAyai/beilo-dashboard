import { Box, Card, CardContent, Typography, Avatar, Grid } from '@mui/material';
import { Rule as RuleIcon, CheckCircle as CheckCircleIcon, Block as BlockIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import type { Rule } from '../../services/rulesData';
import { colors } from '../../theme/colors';

type StatCardColorKey = 'info' | 'success' | 'warning' | 'error' | 'disabled';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorKey: StatCardColorKey;
}

function StatCard({ title, value, icon, colorKey }: StatCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const statColors = colors.statCard[colorKey];
  const bg = isDark ? statColors.bg.dark : statColors.bg.light;
  const color = isDark ? statColors.color.dark : statColors.color.light;

  return (
    <Card sx={{ height: '100%', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color }}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: bg, width: 48, height: 48 }}>
            <Box sx={{ color }}>{icon}</Box>
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

interface RulesStatsProps {
  total: number;
  rules: Rule[];
  t: (key: string) => string;
}

export function RulesStats({ total, rules, t }: RulesStatsProps) {
  const stats = {
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
    critical: rules.filter((r) => r.severity === 'critical').length,
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard title={t('ruleManagement.filteredTotal')} value={total} icon={<RuleIcon />} colorKey="info" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard title={t('ruleManagement.pageEnabled')} value={stats.enabled} icon={<CheckCircleIcon />} colorKey="success" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard title={t('ruleManagement.pageDisabled')} value={stats.disabled} icon={<BlockIcon />} colorKey="disabled" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard title={t('ruleManagement.pageCritical')} value={stats.critical} icon={<WarningIcon />} colorKey="error" />
      </Grid>
    </Grid>
  );
}
