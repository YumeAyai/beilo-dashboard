import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import { colors } from '../theme/colors';
import { getChartPalette, getDonutPalette } from '../theme/chartPalette';

export interface UseEChartsThemeResult {
  isDark: boolean;
  textColor: string;
  backgroundColor: string;
  axisColor: string;
  gridColor: string;
  tooltipTheme: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
  chartColors: {
    primary: string;
    primaryFill: string;
    blocked: string;
    blockedFill: string;
    warning: string;
    warningFill: string;
    success: string;
    successFill: string;
    palette: string[];
    donut: string[];
    paletteSoft: string[];
    browser: string[];
    os: string[];
  };
}

export function useEChartsTheme(): UseEChartsThemeResult {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(() => {
    const textColor = isDark ? colors.text.primaryDark : colors.text.primary;
    const backgroundColor = isDark ? colors.background.paperDark : colors.background.paper;
    const axisColor = isDark ? colors.chart.text.dark : colors.chart.text.light;
    const gridColor = isDark ? colors.chart.grid.dark : colors.chart.grid.light;

    return {
      isDark,
      textColor,
      backgroundColor,
      axisColor,
      gridColor,
      tooltipTheme: {
        backgroundColor: isDark ? colors.background.paperDark : colors.background.paper,
        borderColor: isDark ? colors.border.darkMode : colors.border.light,
        textColor,
      },
      chartColors: {
        primary: isDark ? colors.chart.primary.dark : colors.chart.primary.light,
        primaryFill: isDark ? colors.chart.primary.fill.dark : colors.chart.primary.fill.light,
        blocked: isDark ? colors.chart.blocked.dark : colors.chart.blocked.light,
        blockedFill: isDark ? colors.chart.blocked.fill.dark : colors.chart.blocked.fill.light,
        warning: isDark ? colors.chart.warning.dark : colors.chart.warning.light,
        warningFill: isDark ? colors.chart.warning.fill.dark : colors.chart.warning.fill.light,
        success: isDark ? colors.chart.success.dark : colors.chart.success.light,
        successFill: isDark ? colors.chart.success.fill.dark : colors.chart.success.fill.light,
        palette: getChartPalette(isDark),
        donut: getDonutPalette(isDark),
        paletteSoft: colors.palette.soft,
        browser: getDonutPalette(isDark),
        os: getDonutPalette(isDark),
      },
    };
  }, [isDark]);
}

export function getTooltipFormatter(
  isDark: boolean
): Record<string, unknown> {
  return {
    backgroundColor: isDark ? colors.background.paperDark : colors.background.paper,
    borderColor: isDark ? colors.border.darkMode : colors.border.light,
    textStyle: {
      color: isDark ? colors.text.primaryDark : colors.text.primary,
    },
  };
}
