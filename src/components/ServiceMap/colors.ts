import type { Verdict } from './service-map/types';

export interface ThemeColors {
  primary: string;
  error: string;
  warning: string;
  success: string;
  textSecondary: string;
  border: string;
  cardBg: string;
  headerBg: string;
  sectionBg: string;
}

export const getTrafficColor = (
  errorRate: number,
  requestRate: number,
  colors: ThemeColors
): string => {
  if (errorRate > 0.05) return colors.error;
  if (requestRate > 0) return colors.success;
  return colors.textSecondary;
};

export const getVerdictColor = (verdict?: Verdict, colors?: ThemeColors): string => {
  const defaultColors = {
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    textSecondary: '#9CA3AF',
  };
  const c = colors ?? defaultColors;

  switch (verdict?.toLowerCase()) {
    case 'dropped':
      return c.error ?? '#EF4444';
    case 'denied':
      return c.warning ?? '#F59E0B';
    case 'forwarded':
      return c.success ?? '#10B981';
    default:
      return c.textSecondary ?? '#9CA3AF';
  }
};

export const getThreatColor = (threatCount: number, requestCount: number): string => {
  const ratio = requestCount > 0 ? threatCount / requestCount : 0;
  if (ratio > 0.1) return '#ef5350';
  if (ratio > 0.03) return '#ff9800';
  return '#42a5f5';
};

export const getNodeIconColor = (type: string): string => {
  switch (type) {
    case 'host':
      return '#8B5CF6';
    case 'world':
      return '#6366F1';
    case 'database':
      return '#10B981';
    default:
      return '#3B82F6';
  }
};

export const getTrafficLabel = (
  direction?: 'ingress' | 'egress' | 'internal'
): string | null => {
  switch (direction) {
    case 'ingress':
      return 'pass req to next';
    case 'egress':
      return 'pass req out';
    default:
      return null;
  }
};
