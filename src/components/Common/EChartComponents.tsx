import { useMemo, memo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { useEChartsTheme } from '../../hooks/useEChartsTheme';
import { colors } from '../../theme/colors';

const getTimezone = (): string => {
  try {
    const saved = localStorage.getItem('beilo_general_settings');
    if (saved) return JSON.parse(saved).timezone || 'Asia/Shanghai';
  } catch { /* ignore */ }
  return 'Asia/Shanghai';
};

const formatTooltipTime = (value: string | number, showSeconds = false): string => {
  const str = String(value);
  if (!str) return '';
  try {
    let date: Date;
    if (/^\d+$/.test(str)) {
      const n = parseInt(str);
      date = new Date(n > 1e12 ? n : n * 1000);
    } else {
      date = new Date(str);
    }
    if (isNaN(date.getTime())) return str;
    return date.toLocaleString(undefined, {
      timeZone: getTimezone(),
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds ? { second: '2-digit' } : {}),
    });
  } catch {
    return str;
  }
};

// ============================================
// 面积图组件 (Threat Trend / Request Trend)
// ============================================
export interface AreaChartDataPoint {
  time: string;
  [key: string]: string | number | null;
}

interface EAreaChartProps {
  data: AreaChartDataPoint[];
  series: Array<{
    dataKey: string;
    name: string;
    colorKey: 'primary' | 'warning' | 'blocked';
  }>;
  peak?: number;
  height?: number;
}

export const EAreaChart = memo(function EAreaChart({ data, series, peak, height = 200 }: EAreaChartProps) {
  const { chartColors, tooltipTheme } = useEChartsTheme();
  const animationRef = useRef({ initialized: false, hasRendered: false });

  useEffect(() => {
    // Mark as rendered after first render to disable animation on subsequent renders
    animationRef.current.hasRendered = true;
  }, []);

  const option = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs --- 这里我们不依赖 refs 进行渲染，而是通过 useEffect 标记是否已经渲染过一次
    const isAnimated = !animationRef.current.hasRendered;

    // 解析时间跨度决定轴格式和打点密度
    const parseTs = (v: string): number => {
      if (/^\d+$/.test(v)) {
        const n = parseInt(v);
        return n > 1e12 ? n : n * 1000;
      }
      return new Date(v).getTime();
    };
    const firstTs = data.length > 0 ? parseTs(data[0].time) : 0;
    const lastTs = data.length > 0 ? parseTs(data[data.length - 1].time) : 0;
    const spanHours = (lastTs - firstTs) / 3600000;
    const showDate = spanHours > 24;
    const axisInterval = spanHours > 72 ? Math.ceil(data.length / 8) : spanHours > 24 ? Math.ceil(data.length / 12) : 2;

    const formatAxisLabel = (value: string): string => {
      if (!value) return '';
      try {
        let date: Date;
        if (/^\d+$/.test(value)) {
          const n = parseInt(value);
          date = new Date(n > 1e12 ? n : n * 1000);
        } else {
          date = new Date(value);
        }
        if (isNaN(date.getTime())) return value;
        if (showDate) {
          return date.toLocaleString(undefined, {
            timeZone: getTimezone(),
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        return date.toLocaleString(undefined, {
          timeZone: getTimezone(),
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return value;
      }
    };

    const echartsSeries: Array<Record<string, unknown>> = series.map(s => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      color: chartColors[s.colorKey],
      lineStyle: {
        width: 2,
        color: chartColors[s.colorKey],
      },
      areaStyle: {
        color: chartColors[`${s.colorKey}Fill`],
      },
      data: data.map(d => [d.time, d[s.dataKey]]),
      animation: isAnimated,
      animationDuration: isAnimated ? 300 : 0,
    }));

    if (peak) {
      echartsSeries.push({
        name: 'Peak',
        type: 'line',
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            type: 'dashed',
            color: colors.chart.reference.light,
          },
          data: [{ yAxis: peak }],
          label: {
            formatter: 'Peak',
            color: colors.chart.reference.light,
            fontSize: 10,
          },
        },
        data: [],
      } as Record<string, unknown>);
    }

    return {
      color: chartColors.palette,
      backgroundColor: 'transparent',
      animationDurationUpdate: 0,
      grid: {
        top: 5,
        right: 5,
        bottom: 24,
        left: 5,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.time),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          interval: axisInterval,
          color: tooltipTheme.textColor,
          fontSize: 8,
          formatter: (value: string) => formatAxisLabel(value),
        },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipTheme.backgroundColor,
        borderColor: tooltipTheme.borderColor,
        textStyle: {
          color: tooltipTheme.textColor,
        },
        formatter: (params: Array<{ seriesName: string; value: [string, number | null]; color: string }>) => {
          if (!params || params.length === 0) return '';
          const time = formatTooltipTime(params[0].value[0]);
          let result = `${time}<br/>`;
          params.forEach(p => {
            if (p.seriesName !== 'Peak') {
              result += `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}: ${p.value[1] ?? '—'}<br/>`;
            }
          });
          return result;
        },
      },
      series: echartsSeries,
    };
  }, [data, series, peak, chartColors, tooltipTheme]);

  return (
    <Box sx={{ width: '100%', height }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
});

// ============================================
// 嵌套饼图 (Nightingale Chart) - Client Source / Response Status
// ============================================
interface PieDataItem {
  name: string;
  value: number;
  color?: string;
}

interface ENightingaleChartProps {
  outerData: PieDataItem[];
  innerData: PieDataItem[];
  outerName: string;
  innerName: string;
  height?: number;
  width?: number;
}

export const ENightingaleChart = memo(function ENightingaleChart({
  outerData,
  innerData,
  outerName,
  innerName,
  height = 200,
  width = 200
}: ENightingaleChartProps) {
  const { tooltipTheme, chartColors } = useEChartsTheme();

  const option = useMemo(() => ({
    color: chartColors.donut,
    backgroundColor: 'transparent',
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipTheme.backgroundColor,
      borderColor: tooltipTheme.borderColor,
      textStyle: {
        color: tooltipTheme.textColor,
      },
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: outerName,
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '50%'],
        roseType: 'area',
        stillShowZeroSum: false,
        itemStyle: {
          borderRadius: 3,
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: outerData.filter(d => Number.isFinite(d.value) && d.value > 0).map(d => ({
          name: d.name,
          value: d.value,
          ...(d.color && { itemStyle: { color: d.color } }),
        })),
      },
      {
        name: innerName,
        type: 'pie',
        radius: ['0%', '30%'],
        center: ['50%', '50%'],
        roseType: 'area',
        stillShowZeroSum: false,
        itemStyle: {
          borderRadius: 3,
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: innerData.filter(d => Number.isFinite(d.value) && d.value > 0).map(d => ({
          name: d.name,
          value: d.value,
          ...(d.color && { itemStyle: { color: d.color } }),
        })),
      },
    ],
  }), [outerData, innerData, outerName, innerName, tooltipTheme, chartColors]);

  return (
    <Box sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
});

// ============================================
// 普通饼图 - Attack Type Distribution
// ============================================
interface EPieChartProps {
  data: PieDataItem[];
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  showLabels?: boolean;  // 是否显示延伸标签
}

export const EPieChart = memo(function EPieChart({ data, innerRadius = 50, outerRadius = 80, height = 200, showLabels = false }: EPieChartProps) {
  const { tooltipTheme, chartColors } = useEChartsTheme();

  const option = useMemo(() => {
    // 计算标签位置偏移量
    const labelOffset = showLabels ? 15 : 0;

    return {
      color: chartColors.donut,
      backgroundColor: 'transparent',
      animationDurationUpdate: 0,
      tooltip: {
        trigger: 'item',
        backgroundColor: tooltipTheme.backgroundColor,
        borderColor: tooltipTheme.borderColor,
        textStyle: {
          color: tooltipTheme.textColor,
        },
        formatter: (params: { name: string; value: number; percent: number; color: string }) => {
          return `<div style="font-weight:bold">${params.name}</div>
                  <div>次数: ${params.value}</div>
                  <div>占比: ${params.percent.toFixed(1)}%</div>`;
        },
      },
      legend: {
        show: false,
      },
      series: [
        {
          type: 'pie',
          radius: [innerRadius, outerRadius],
          center: ['50%', '50%'],
          data: data.map(d => ({
            name: d.name,
            value: d.value,
            ...(d.color && { itemStyle: { color: d.color } }),
          })),
          itemStyle: {
            borderRadius: 4,
          },
          label: {
            show: showLabels,
            position: 'outside',
            formatter: '{b}: {d}%',
            fontSize: 11,
            color: tooltipTheme.textColor,
            lineHeight: 16,
            padding: [0, 0, 0, 0],
          },
          labelLine: {
            show: showLabels,
            length: labelOffset,
            length2: 10,
            lineStyle: {
              color: tooltipTheme.textColor,
              opacity: 0.6,
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
            },
          },
        },
      ],
    };
  }, [data, innerRadius, outerRadius, showLabels, tooltipTheme, chartColors]);

  return (
    <Box sx={{ width: '100%', height }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
});

// ============================================
// 横向进度条 - External/Visited Domains/Pages
// ============================================
interface EHorizontalBarProps {
  data: Array<{ name: string; count: number }>;
  color: string;
  height?: number;
}

export const EHorizontalBar = memo(function EHorizontalBar({ data, color }: EHorizontalBarProps) {
  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 1, overflow: 'auto' }}>
      {data.map((item) => (
        <Box key={item.name} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
              {item.name}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 12 }}>
              {item.count}
            </Typography>
          </Box>
          <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${(item.count / maxCount) * 100}%`,
                bgcolor: color,
                borderRadius: 1,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
});

// ============================================
// QPS 直方图 - ECharts 版本
// 动画效果：旧柱从左侧滑出消失，新柱从右侧滑入
// ============================================
interface EQpsHistogramProps {
  data: Array<{ time: number | string; qps: number }>;
  height?: number;
}

export const EQpsHistogram = memo(function EQpsHistogram({ data, ...props }: EQpsHistogramProps) {
  void props; // suppress unused warning
  const { chartColors, tooltipTheme } = useEChartsTheme();

  const option = useMemo(() => {
    const maxQps = Math.max(...data.map(d => d.qps), 1);
    const yMax = Math.ceil(maxQps / 20) * 20 || 100;

    return {
      color: chartColors.palette,
      backgroundColor: 'transparent',
      animationDurationUpdate: 0,
      grid: {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.time),
        show: false,
      },
      yAxis: {
        type: 'value',
        max: yMax,
        show: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipTheme.backgroundColor,
        borderColor: tooltipTheme.borderColor,
        textStyle: {
          color: tooltipTheme.textColor,
        },
        formatter: (params: Array<{ name: string; value: number }>) => {
          if (!params || params.length === 0) return '';
          return `${formatTooltipTime(params[0].name || '', true)}<br/>QPS: ${params[0].value}`;
        },
      },
      series: [
        {
          type: 'bar',
          data: data.map(d => d.qps),
          itemStyle: {
            color: chartColors.primary,
            borderRadius: [2, 2, 0, 0],
          },
          animationDuration: 300,
          animationEasing: 'sineOut',
        },
      ],
    };
  }, [data, chartColors, tooltipTheme]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ReactECharts option={option} style={{ flex: 1, minHeight: 0 }} />
    </Box>
  );
});
