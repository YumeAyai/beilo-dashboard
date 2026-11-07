import { Avatar, Box, Stack, Tabs, Typography, type TabsProps } from '@mui/material';
import type { ReactNode } from 'react';
import { colors } from '../../theme/colors';

interface PageLayoutProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

// Match the page headers used by Rules, Settings and Threat. MainLayout owns
// the page padding, so individual pages must not add another outer gutter.
export function PageLayout({ title, subtitle, icon, badge, actions, children }: PageLayoutProps) {
  return <Box sx={{ minWidth: 0, width: '100%' }}>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
      <Stack direction="row" gap={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar sx={{ bgcolor: `${colors.primary.main}15`, color: colors.primary.main }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography component="h1" variant="h5" fontWeight="bold">{title}</Typography>
            {badge}
          </Stack>
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Stack>
      {actions && <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap" sx={{ flexShrink: 0 }}>{actions}</Stack>}
    </Stack>
    {children}
  </Box>;
}

export function PageTabs(props: Omit<TabsProps, 'sx' | 'variant' | 'scrollButtons'>) {
  return <Tabs {...props} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', minWidth: 0 }} />;
}
