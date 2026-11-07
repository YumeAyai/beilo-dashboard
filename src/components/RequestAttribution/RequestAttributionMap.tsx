import { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableBody, TableCell, TableRow, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useTranslation } from 'react-i18next';
import { useEChartsTheme } from '../../hooks/useEChartsTheme';
import type { SourceAddressType } from '../../types/threat';

// Arc data type
export interface AttributionEntry {
  ip: string;
  addressType?: SourceAddressType;
  country: string;
  countryCode: string;
  city: string;
  requestCount: number;
  threatCount: number;
  lat: number;
  lng: number;
  wafId?: string;
}

export interface WafTarget {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  requests: number;
  threats: number;
  blocked: number;
  ip?: string;
}

interface Props {
  data: AttributionEntry[];
  wafLocations?: WafTarget[];
}

// Threat level colors - light/dark mode aware
const THREAT_COLORS = {
  normal: { light: '#71b6ee', dark: '#69B4FF' },      // Blue
  elevated: { light: '#e9b466', dark: '#FFB74D' },   // Orange
  highThreat: { light: '#f17a78', dark: '#FF8A8A' },  // Red
  wafTarget: { light: '#e1a2ec', dark: '#BA68C8' },   // Purple
};

// Country code to ECharts world map name mapping
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  CN: 'China', US: 'United States', RU: 'Russia', DE: 'Germany', GB: 'United Kingdom',
  FR: 'France', JP: 'Japan', KR: 'South Korea', IN: 'India', BR: 'Brazil',
  CA: 'Canada', AU: 'Australia', IT: 'Italy', ES: 'Spain', MX: 'Mexico',
  ID: 'Indonesia', NL: 'Netherlands', SA: 'Saudi Arabia', TR: 'Turkey', CH: 'Switzerland',
  PL: 'Poland', AR: 'Argentina', SE: 'Sweden', BE: 'Belgium', TH: 'Thailand',
  NG: 'Nigeria', AT: 'Austria', NO: 'Norway', UA: 'Ukraine', ZA: 'South Africa',
  EG: 'Egypt', IL: 'Israel', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan',
  VN: 'Vietnam', PH: 'Philippines', MY: 'Malaysia', CO: 'Colombia', CL: 'Chile',
  DK: 'Denmark', FI: 'Finland', IE: 'Ireland', PT: 'Portugal', GR: 'Greece',
  CZ: 'Czech Rep.', RO: 'Romania', NZ: 'New Zealand', HU: 'Hungary', PE: 'Peru',
  AE: 'United Arab Emirates', PK: 'Pakistan', BD: 'Bangladesh', IR: 'Iran',
  KZ: 'Kazakhstan', DZ: 'Algeria', MA: 'Morocco', TN: 'Tunisia', KE: 'Kenya',
  GH: 'Ghana', UG: 'Uganda', ET: 'Ethiopia', TZ: 'Tanzania', AO: 'Angola',
  SD: 'Sudan', LY: 'Libya', CD: 'Dem. Rep. Congo', IQ: 'Iraq', SY: 'Syria',
  MM: 'Myanmar', NP: 'Nepal', LK: 'Sri Lanka', MN: 'Mongolia', GE: 'Georgia',
  AZ: 'Azerbaijan', AM: 'Armenia', BY: 'Belarus', LT: 'Lithuania', LV: 'Latvia',
  EE: 'Estonia', MD: 'Moldova', BG: 'Bulgaria', HR: 'Croatia', RS: 'Serbia',
  SK: 'Slovakia', SI: 'Slovenia', BA: 'Bosnia and Herz.', MK: 'Macedonia',
  AL: 'Albania', ME: 'Montenegro', IS: 'Iceland', LU: 'Luxembourg', MT: 'Malta',
  CY: 'Cyprus', QA: 'Qatar', KW: 'Kuwait', OM: 'Oman', JO: 'Jordan',
  LB: 'Lebanon', PS: 'Palestine', YE: 'Yemen', AF: 'Afghanistan',
  KH: 'Cambodia', LA: 'Laos', BN: 'Brunei', MV: 'Maldives', BT: 'Bhutan',
  UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', EC: 'Ecuador', VE: 'Venezuela',
  PA: 'Panama', CR: 'Costa Rica', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador',
  NI: 'Nicaragua', CU: 'Cuba', DO: 'Dominican Rep.', JM: 'Jamaica', HT: 'Haiti',
  TT: 'Trinidad and Tobago', PR: 'Puerto Rico',
};

// Threat ratio to color (theme-aware)
function threatColor(threatCount: number, requestCount: number, isDark: boolean): string {
  const ratio = requestCount > 0 ? threatCount / requestCount : 0;
  if (ratio > 0.1) return THREAT_COLORS.highThreat[isDark ? 'dark' : 'light'];
  if (ratio > 0.03) return THREAT_COLORS.elevated[isDark ? 'dark' : 'light'];
  return THREAT_COLORS.normal[isDark ? 'dark' : 'light'];
}

function hasAnchorCoordinate(point: { lat: number; lng: number }): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

// An unknown source is not a geographic point. WAF targets separately retain
// the original local 0/0 logical anchor when no geographic location is set.
function hasMapCoordinate(point: { lat: number; lng: number }): boolean {
  return hasAnchorCoordinate(point) && (point.lat !== 0 || point.lng !== 0);
}

// Registered flag to avoid double registration
let mapRegistered = false;

export function RequestAttributionMap({
  data,
  wafLocations = [],
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(mapRegistered);
  const [legendVisible, setLegendVisible] = useState({ 'Country Heatmap': true, Normal: true, Elevated: true, 'High Threat': true, 'WAF Target': true });
  const { tooltipTheme } = useEChartsTheme();

  const mapBg = isDark ? '#1a1a2e' : '#f0f4f8';

  // Register map once
  useEffect(() => {
    if (mapRegistered) {
      // Already registered in a previous instance, just mark ready
      return;
    }

    fetch('/world.json')
      .then(res => res.json())
      .then((geoJSON) => {
        echarts.registerMap('world', geoJSON);
        mapRegistered = true;
        // Defer setState to avoid cascading render warning
        queueMicrotask(() => setMapReady(true));
      })
      .catch((err) => {
        console.error('Failed to load world map:', err);
        queueMicrotask(() => setMapReady(true));
      });
  }, []);

  // Sorted data by request count
  const sortedData = useMemo(() =>
    [...data].sort((a, b) => b.requestCount - a.requestCount),
    [data]
  );

  const totalRequests = useMemo(() =>
    data.reduce((sum, d) => sum + d.requestCount, 0),
    [data]
  );

  const totalThreats = useMemo(() =>
    data.reduce((sum, d) => sum + d.threatCount, 0),
    [data]
  );

  const maxRequest = useMemo(() => Math.max(...data.map(d => d.requestCount), 1), [data]);

  // Aggregate data by country for heatmap coloring (request volume)
  const countryAggregatedData = useMemo(() => {
    const map = new Map<string, { requestCount: number; threatCount: number }>();
    for (const d of data) {
      if (d.addressType && d.addressType !== 'public') continue;
      const key = (COUNTRY_CODE_TO_NAME[d.countryCode.trim().toUpperCase()] || d.country).trim();
      // world.json contains two unnamed polygons. An empty country is unknown,
      // not a geographic region, and must never join onto those map features.
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.requestCount += d.requestCount;
        existing.threatCount += d.threatCount;
      } else {
        map.set(key, { requestCount: d.requestCount, threatCount: d.threatCount });
      }
    }
    return Array.from(map.entries()).map(([name, { requestCount, threatCount }]) => ({
      name,
      value: requestCount,
      threatCount,
    }));
  }, [data]);

  const maxCountryRequests = useMemo(() =>
    Math.max(...countryAggregatedData.map(d => d.value), 1),
    [countryAggregatedData]
  );

  const visualMapColors = useMemo(() =>
    isDark
      ? ['#2a2a4a', '#4a4a7a', '#7a7ab8', '#a8a8d8', '#d0d0f0']
      : ['#e8edf3', '#b8d4e8', '#6baed6', '#2171b5', '#084594'],
    [isDark]
  );

  const option = useMemo(() => {
    if (!mapReady) return {};

    const normalColor = THREAT_COLORS.normal[isDark ? 'dark' : 'light'];
    const elevatedColor = THREAT_COLORS.elevated[isDark ? 'dark' : 'light'];
    const highThreatColor = THREAT_COLORS.highThreat[isDark ? 'dark' : 'light'];
    const locatedData = data.filter(source => (!source.addressType || source.addressType === 'public') && hasMapCoordinate(source));
    const normalData = locatedData.filter(d => threatColor(d.threatCount, d.requestCount, isDark) === normalColor);
    const elevatedData = locatedData.filter(d => threatColor(d.threatCount, d.requestCount, isDark) === elevatedColor);
    const highThreatData = locatedData.filter(d => threatColor(d.threatCount, d.requestCount, isDark) === highThreatColor);

    const lineData = (sources: AttributionEntry[]) => sources.flatMap(source => {
      const target = source.wafId ? wafLocations.find(waf => waf.id === source.wafId)
        : wafLocations.length === 1 ? wafLocations[0] : undefined;
      return target && hasAnchorCoordinate(target)
        ? [{ coords: [[source.lng, source.lat], [target.lng, target.lat]] }]
        : [];
    });

    const opt = {
      // Geo roam updates the map, symbols and route layouts together. Disable
      // option-update interpolation so a polling refresh cannot leave an old
      // position animator competing with the next drag. Line effects remain on.
      animation: false,
      backgroundColor: mapBg,
      tooltip: {
        trigger: 'item',
        backgroundColor: tooltipTheme.backgroundColor,
        borderColor: tooltipTheme.borderColor,
        textStyle: {
          color: tooltipTheme.textColor,
        },
        formatter: (params: { data?: unknown; value?: unknown[]; seriesType?: string; seriesName?: string }) => {
          if (!params.data || params.seriesType === 'lines') return '';
          // Country heatmap tooltip
          if (params.seriesType === 'map') {
            const d = params.data as { name?: string; value?: number; threatCount?: number; city?: string; country?: string; ip?: string };
            const ratio = (d.value ?? 0) > 0 ? (((d.threatCount ?? 0) / d.value!) * 100).toFixed(2) : '0.00';
            return `
              <div style="font-weight:600;margin-bottom:4px">${d.name}</div>
              <div>Requests: ${(d.value ?? 0).toLocaleString()}</div>
              <div>Threats: <span style="color:#ef5350">${(d.threatCount ?? 0).toLocaleString()}</span></div>
              <div>Threat Rate: <span style="color:#ef5350">${ratio}%</span></div>
            `;
          }
          const d = params.data as unknown as { name?: string; city?: string; country?: string; ip?: string; requestCount?: number; threatCount?: number };

          // WAF node tooltip
          if (params.seriesName === 'WAF') {
            return `
              <div style="font-weight:600;margin-bottom:4px">WAF · ${d.city}</div>
              <div>${d.country}</div>
              <div>IP: ${d.ip || '-'}</div>
            `;
          }

          // Attack source tooltip
          let country = 'Unknown', city = '', ip = 'N/A', reqCount = 0, thrCount = 0;
          if (Array.isArray(params.data)) {
            const val = params.data as unknown as Array<unknown>;
            country = String(val[4] ?? 'Unknown');
            city = String(val[5] ?? '');
            ip = String(val[6] ?? 'N/A');
            reqCount = Number(val[2] ?? 0);
            thrCount = Number(val[3] ?? 0);
          } else {
            country = d.country ?? 'Unknown';
            city = d.city ?? '';
            ip = d.ip ?? 'N/A';
            reqCount = Number(d.requestCount ?? 0);
            thrCount = Number(d.threatCount ?? 0);
          }
          const ratio = reqCount > 0 ? ((thrCount / reqCount) * 100).toFixed(2) : '0.00';
          return `
            <div style="font-weight:600;margin-bottom:4px">${country} (${city})</div>
            <div>IP: ${ip}</div>
            <div>Requests: ${reqCount.toLocaleString()}</div>
            <div>Threats: <span style="color:#ef5350">${thrCount.toLocaleString()}</span></div>
            <div>Threat Rate: <span style="color:#ef5350">${ratio}%</span></div>
          `;
        },
      },
      visualMap: {
        show: true,
        left: 10,
        bottom: 10,
        orient: 'vertical',
        min: 0,
        max: maxCountryRequests,
        inRange: {
          color: visualMapColors,
        },
        textStyle: {
          color: isDark ? '#aaa' : '#666',
          fontSize: 11,
        },
        itemWidth: 20,
        itemHeight: 120,
        text: ['High', 'Low'],
        seriesIndex: [0],
      },
      legend: {
        show: true,
        bottom: 2,
        left: 'center',
        textStyle: {
          color: isDark ? '#aaa' : '#666',
          fontSize: 11,
        },
        inactiveColor: isDark ? '#555' : '#ccc',
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 16,
        selected: {
          'Country Heatmap': legendVisible['Country Heatmap'],
          'Normal': legendVisible.Normal,
          'Elevated': legendVisible.Elevated,
          'High Threat': legendVisible['High Threat'],
          'WAF Target': legendVisible['WAF Target'],
        },
      },
      geo: {
        map: 'world',
        roam: true,
        aspectScale: 0.8,
        scaleLimit: {
          min: 1,
          max: 20,
        },
        itemStyle: {
          areaColor: isDark ? '#1e1e3a' : '#e8edf3',
          borderColor: isDark ? '#3a3a5c' : '#c8d4e0',
        },
        emphasis: {
          itemStyle: {
            areaColor: isDark ? '#3a3a5c' : '#d0dce8',
          },
        },
        silent: false,
        zlevel: 0,
      },
      series: [
        // Country heatmap - renders countries colored by request volume
        {
          name: 'Country Heatmap',
          type: 'map',
          map: 'world',
          geoIndex: 0,
          data: countryAggregatedData.map(d => ({
            name: d.name,
            value: d.value,
            threatCount: d.threatCount,
          })),
          itemStyle: {
            borderColor: isDark ? '#3a3a5c' : '#c8d4e0',
          },
          emphasis: {
            itemStyle: {
              areaColor: isDark ? '#3a3a5c' : '#d0dce8',
            },
          },
          zlevel: 0,
        },
        // Normal traffic
        {
          name: 'Normal',
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: 0,
          large: true,
          zlevel: 1,
          itemStyle: { color: normalColor },
          data: normalData.map(d => ({
            value: [d.lng, d.lat, d.requestCount, d.threatCount],
            country: d.country,
            city: d.city,
            ip: d.ip,
            requestCount: d.requestCount,
            threatCount: d.threatCount,
            itemStyle: { color: normalColor },
          })),
          symbolSize: (val: number[]) => 6 + (val[2] / maxRequest) * 20,
        },
        // Elevated threat
        {
          name: 'Elevated',
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: 0,
          large: true,
          zlevel: 1,
          itemStyle: { color: elevatedColor },
          data: elevatedData.map(d => ({
            value: [d.lng, d.lat, d.requestCount, d.threatCount],
            country: d.country,
            city: d.city,
            ip: d.ip,
            requestCount: d.requestCount,
            threatCount: d.threatCount,
            itemStyle: { color: elevatedColor },
          })),
          symbolSize: (val: number[]) => 6 + (val[2] / maxRequest) * 20,
        },
        // High threat
        {
          name: 'High Threat',
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: 0,
          large: true,
          zlevel: 1,
          itemStyle: { color: highThreatColor },
          data: highThreatData.map(d => ({
            value: [d.lng, d.lat, d.requestCount, d.threatCount],
            country: d.country,
            city: d.city,
            ip: d.ip,
            requestCount: d.requestCount,
            threatCount: d.threatCount,
            itemStyle: { color: highThreatColor },
          })),
          symbolSize: (val: number[]) => 6 + (val[2] / maxRequest) * 20,
        },
        // Normal traffic lines
        {
          name: 'Normal',
          type: 'lines',
          coordinateSystem: 'geo',
          geoIndex: 0,
          zlevel: 2,
          silent: true,
          effect: { show: true, period: 8, trailLength: 0.4, symbol: 'circle', symbolSize: 3 },
          lineStyle: {
            width: 0.5,
            opacity: 0.5,
            curveness: 0.2,
            cap: 'round',
            color: normalColor,
          },
          data: lineData(normalData),
        },
        // Elevated traffic lines
        {
          name: 'Elevated',
          type: 'lines',
          coordinateSystem: 'geo',
          geoIndex: 0,
          zlevel: 2,
          silent: true,
          effect: { show: true, period: 8, trailLength: 0.4, symbol: 'circle', symbolSize: 3 },
          lineStyle: {
            width: 0.5,
            opacity: 0.5,
            curveness: 0.2,
            cap: 'round',
            color: elevatedColor,
          },
          data: lineData(elevatedData),
        },
        // High threat traffic lines
        {
          name: 'High Threat',
          type: 'lines',
          coordinateSystem: 'geo',
          geoIndex: 0,
          zlevel: 2,
          silent: true,
          effect: { show: true, period: 8, trailLength: 0.4, symbol: 'circle', symbolSize: 3 },
          lineStyle: {
            width: 0.5,
            opacity: 0.5,
            curveness: 0.2,
            cap: 'round',
            color: highThreatColor,
          },
          data: lineData(highThreatData),
        },
        // WAF Targets (multi-node, single legend)
        {
          name: 'WAF',
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: 0,
          zlevel: 1,
          animation: false,
          data: wafLocations.filter(hasAnchorCoordinate).map((w) => ({
            value: [w.lng, w.lat],
            name: w.city,
            country: w.country,
            city: w.city,
            ip: w.ip || '',
            requestCount: w.requests,
            threatCount: w.threats,
            blockedCount: w.blocked,
          })),
          symbolSize: 14,
          itemStyle: {
            color: THREAT_COLORS.wafTarget[isDark ? 'dark' : 'light'],
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: `rgba(156,39,176,0.5)`,
          },
          label: {
            show: true,
            position: 'bottom',
            formatter: '{b}',
            color: isDark ? '#aaa' : '#666',
            fontSize: 10,
            fontWeight: 600,
          },
        },
      ],
    };

    return opt;
  }, [data, wafLocations, mapBg, isDark, tooltipTheme, mapReady, maxRequest, countryAggregatedData, maxCountryRequests, visualMapColors, legendVisible]);

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 1 }}>
      {/* Map Panel */}
      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%', borderRadius: 8 }}
          onEvents={{
            click: (params: { componentType?: string; data?: Record<string, unknown> }) => {
              if (params.componentType === 'series') {
                const country = params.data?.country as string | undefined;
                if (country) {
                  setSelectedCountry(prev => prev === country ? null : country);
                }
              }
            },
            legendselectchanged: (params: { selected: Record<string, boolean> }) => {
              setLegendVisible(prev => ({
                ...prev,
                Normal: params.selected['Normal'] ?? prev.Normal,
                Elevated: params.selected['Elevated'] ?? prev.Elevated,
                'High Threat': params.selected['High Threat'] ?? prev['High Threat'],
                'Country Heatmap': params.selected['Country Heatmap'] ?? prev['Country Heatmap'],
                'WAF Target': params.selected['WAF Target'] ?? prev['WAF Target'],
              }));
            },
          }}
        />
      </Box>

      {/* Stats Side Panel */}
      <Paper
        sx={{
          width: 250,
          flexShrink: 0,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#1e1e30' : '#f5f7fa' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
            Traffic Summary
          </Typography>
        </Box>

        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">Total Requests</Typography>
          <Typography variant="body1" fontWeight={700}>{totalRequests.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">Total Threats</Typography>
          <Typography variant="body1" fontWeight={700} color="error">{totalThreats.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">Threat Rate</Typography>
          <Typography variant="body1" fontWeight={700}>
            {totalRequests > 0 ? ((totalThreats / totalRequests) * 100).toFixed(2) : '0.00'}%
          </Typography>
        </Box>
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">Source Countries</Typography>
          <Typography variant="body1" fontWeight={700}>{countryAggregatedData.length}</Typography>
        </Box>

        {/* Country table */}
        <Box sx={{ flex: 1, overflow: 'auto', mt: 0.5 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600, px: 1, py: 0.25, fontSize: '0.7rem', bgcolor: isDark ? '#353535' : '#ffffff' }}>#</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600, px: 1, py: 0.25, fontSize: '0.7rem', bgcolor: isDark ? '#353535' : '#ffffff' }}>Country</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600, py: 0.25, fontSize: '0.7rem', bgcolor: isDark ? '#353535' : '#ffffff' }}>Reqs</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600, py: 0.25, fontSize: '0.7rem', bgcolor: isDark ? '#353535' : '#ffffff' }}>Thr%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((entry, index) => {
                const ratio = entry.requestCount > 0 ? (entry.threatCount / entry.requestCount) * 100 : 0;
                const isSelected = selectedCountry === entry.country;
                const sourceLabel = entry.addressType && entry.addressType !== 'public'
                  ? t(`requestAttribution.addressTypes.${entry.addressType}`)
                  : entry.countryCode || entry.country || t('requestAttribution.unknownLocation');
                const sourceTitle = entry.addressType && entry.addressType !== 'public'
                  ? `${sourceLabel} · ${entry.ip}`
                  : entry.country || t('requestAttribution.unknownLocation');
                return (
                  <TableRow
                    key={entry.ip}
                    hover
                    selected={isSelected}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isDark ? '#2a2a4a' : '#f0f4fa' },
                      '&.Mui-selected': { bgcolor: isDark ? '#1e3a5f' : '#e3f2fd' },
                      '&.Mui-selected:hover': { bgcolor: isDark ? '#1e3a5f' : '#e3f2fd' },
                    }}
                    onClick={() => setSelectedCountry(prev => prev === entry.country ? null : entry.country)}
                  >
                    <TableCell sx={{ px: 1, py: 0.25, fontSize: '0.7rem', color: 'text.secondary' }}>{index + 1}</TableCell>
                    <TableCell sx={{ py: 0.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: threatColor(entry.threatCount, entry.requestCount, isDark),
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }} title={sourceTitle}>
                          {sourceLabel}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.25, fontSize: '0.7rem' }}>
                      {entry.requestCount >= 1000
                        ? `${(entry.requestCount / 1000).toFixed(1)}K`
                        : entry.requestCount}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.25, fontSize: '0.7rem' }}>
                      {ratio > 0 ? (
                        <Box
                          component="span"
                          sx={{
                            px: 0.5,
                            py: 0.1,
                            borderRadius: 0.5,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: ratio > 10 ? THREAT_COLORS.highThreat[isDark ? 'dark' : 'light'] : ratio > 3 ? THREAT_COLORS.elevated[isDark ? 'dark' : 'light'] : 'text.secondary',
                            bgcolor: ratio > 10 ? `${THREAT_COLORS.highThreat[isDark ? 'dark' : 'light']}26` : ratio > 3 ? `${THREAT_COLORS.elevated[isDark ? 'dark' : 'light']}26` : 'transparent',
                          }}
                        >
                          {ratio.toFixed(1)}%
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
}
