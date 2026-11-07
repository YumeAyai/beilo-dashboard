import { Box, Card, CardActionArea, CardContent, Typography, Avatar, Chip, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { colors } from '../../theme/colors';

// ============================================
// 统计卡片组件
// ============================================
export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'disabled';
  extra?: ReactNode;
  onClick?: () => void;
  trend?: {
    value: string;
    positive?: boolean;
  };
}

export function StatCard({
  title,
  value,
  icon,
  variant = 'info',
  extra,
  onClick,
  trend,
}: StatCardProps) {
  const { palette } = useTheme();
  const variantConfig = colors.statCard[variant];
  const bgColor = variantConfig.bg[palette.mode];
  const iconColor = variantConfig.color[palette.mode];

  const content = (
      <CardContent sx={{ p: 2.5, height: '100%', '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{ color: iconColor }}
            >
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: bgColor, color: iconColor, width: 44, height: 44, ml: 1.5 }}>
            {icon}
          </Avatar>
        </Box>
        {extra && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {extra}
          </Box>
        )}
        {trend && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              color={trend.positive !== false ? 'success.main' : 'error.main'}
            >
              {trend.value}
            </Typography>
          </Box>
        )}
      </CardContent>
  );
  return <Card sx={{ borderRadius: 2, height: '100%', minHeight: 150, minWidth: 0 }}>
    {onClick ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{content}</CardActionArea> : content}
  </Card>;
}

// ============================================
// 可拖拽卡片包装器
// ============================================
export interface DraggableCardProps {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  selected?: boolean;
}

export function DraggableCard({ title, badge, children, selected }: DraggableCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        boxShadow: 0,
        border: selected ? 'none' : '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        '&:focus': {
          outline: 'none',
          border: 'none',
        },
      }}
    >
      <Box
        className="drag-handle"
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          cursor: 'move',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
          {title}
        </Typography>
        {badge}
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', px: 2, pb: 2, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Card>
  );
}

// ============================================
// 空数据占位符
// ============================================
export interface EmptyStateProps {
  message?: string;
  height?: number | string;
}

export function EmptyState({ message = '暂无数据', height = 200 }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

// ============================================
// 集群健康状态指示器
// ============================================
export interface ClusterStatusDotProps {
  status: 'healthy' | 'degraded' | 'down';
  size?: number;
}

export function ClusterStatusDot({ status, size = 8 }: ClusterStatusDotProps) {
  const statusColors = {
    healthy: colors.success,
    degraded: colors.warning,
    down: colors.error,
  };

  const color = statusColors[status];

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color.light,
      }}
    />
  );
}

// ============================================
// 峰值标签
// ============================================
export interface PeakBadgeProps {
  peak: number;
  label?: string;
}

export function PeakBadge({ peak, label = 'Peak' }: PeakBadgeProps) {
  return (
    <Chip
      label={`${label}: ${peak}`}
      size="small"
      sx={{
        bgcolor: 'divider',
        fontSize: 10,
      }}
    />
  );
}

// ============================================
// 颜色指示器（用于图表图例）
// ============================================
export interface ColorIndicatorProps {
  color: string;
  size?: number;
}

export function ColorIndicator({ color, size = 10 }: ColorIndicatorProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
        flexShrink: 0,
      }}
    />
  );
}

// ============================================
// 双列图例（用于双环图）
// ============================================
export interface DualLegendProps {
  outerLabel: string;
  outerColor: string;
  innerLabel: string;
  innerColor: string;
  outerItems?: Array<{ name: string; value: string | number; color: string }>;
  innerItems?: Array<{ name: string; value: string | number; color: string }>;
}

export function DualLegend({
  outerLabel,
  outerColor,
  innerLabel,
  innerColor,
  outerItems,
  innerItems,
}: DualLegendProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, height: '100%' }}>
      {/* Inner column */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <ColorIndicator color={innerColor} size={8} />
          <Typography variant="caption" fontWeight="bold" color="text.secondary">
            {innerLabel}
          </Typography>
        </Box>
        {innerItems?.map((item) => (
          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <ColorIndicator color={item.color} size={8} />
            <Typography variant="caption" noWrap sx={{ flex: 1 }}>
              {item.name}
            </Typography>
            <Typography variant="caption" fontWeight={500}>
              {item.value}%
            </Typography>
          </Box>
        ))}
      </Box>
      {/* Outer column */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <ColorIndicator color={outerColor} size={8} />
          <Typography variant="caption" fontWeight="bold" color="text.secondary">
            {outerLabel}
          </Typography>
        </Box>
        {outerItems?.map((item) => (
          <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <ColorIndicator color={item.color} size={8} />
            <Typography variant="caption" noWrap sx={{ flex: 1 }}>
              {item.name}
            </Typography>
            <Typography variant="caption" fontWeight={500}>
              {item.value}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
