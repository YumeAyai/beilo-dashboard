import { displayObserved, type ObservationMetadata } from "../types/observability";
import { ObservationNotice } from "../components/ObservationNotice";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Global, css } from '@emotion/react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Web as WebIcon,
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { ProtectionCountersCard } from '../components/ProtectionCountersCard';
import type { ProtectionCounters } from '../types/observability';
import { RequestAttributionMap } from '../components/RequestAttribution/RequestAttributionMap';
import GridLayout from 'react-grid-layout/legacy';
import { useGridLayout, type LayoutItem } from '../hooks/useGridLayout';
import 'react-grid-layout/css/styles.css';
import { dashboardApi, type ClusterHealthResponse, type SourceAddressType } from '../services/api';
import { colors } from '../theme/colors';
import { getChartPalette, getClientCategoryColor, getResponseStatusColor } from '../theme/chartPalette';
import { CommonChip } from '../components/Common/CommonChip';
import { summaryCardSx, summaryCardContentSx, summaryMetricsSx } from '../components/Common/summaryCardStyles';
import { useTranslation } from 'react-i18next';

interface WafLocationExtended {
  id?: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng?: number;
  lon?: number;
  ip?: string;
  status?: string;
  requests?: number;
  threats?: number;
  blocked?: number;
}
import {
  DraggableCard,
  EAreaChart,
  ENightingaleChart,
  EHorizontalBar,
  EQpsHistogram,
} from '../components/Common';

const formatShare = (value: number, entries: Array<{ value: number }>) => {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return `${total > 0 ? (value / total * 100).toFixed(1) : '0'}%`;
};

const ROW_HEIGHT = 30;
const LAYOUT_STORAGE_KEY = 'dashboard-layout';

const CLUSTER_COMPONENT_LABELS: Record<string, string> = {
  'Kubernetes API': 'dashboard.clusterStatus.apiServer',
  etcd: 'dashboard.clusterStatus.etcd',
  Redis: 'dashboard.clusterStatus.redis',
  Loki: 'dashboard.clusterStatus.loki',
  'Worker Node': 'dashboard.clusterStatus.workerNode',
};

const WIDGETS = {
  threatTrend: 'threatTrend',
  requestTrend: 'requestTrend',
  qpsChart: 'qpsChart',
  clientSource: 'clientSource',
  responseStatus: 'responseStatus',
  externalSourceDomains: 'externalSourceDomains',
  externalSourcePages: 'externalSourcePages',
  visitedDomains: 'visitedDomains',
  visitedPages: 'visitedPages',
  requestAttribution: 'requestAttribution',
} as const;

const PREVIOUS_DEFAULT_LAYOUT: LayoutItem[] = [
  { i: WIDGETS.requestAttribution, x: 0, y: 6, w: 8, h: 14, minW: 6, minH: 8 },
  { i: WIDGETS.qpsChart, x: 8, y: 6, w: 4, h: 10, minW: 3, minH: 6 },
  { i: WIDGETS.requestTrend, x: 8, y: 16, w: 4, h: 6, minW: 3, minH: 6 },
  { i: WIDGETS.threatTrend, x: 8, y: 22, w: 4, h: 6, minW: 3, minH: 6 },
  { i: WIDGETS.clientSource, x: 0, y: 20, w: 4, h: 8, minW: 3, minH: 6 },
  { i: WIDGETS.responseStatus, x: 4, y: 20, w: 4, h: 8, minW: 3, minH: 6 },
  { i: WIDGETS.externalSourceDomains, x: 0, y: 28, w: 3, h: 8, minW: 2, minH: 8 },
  { i: WIDGETS.externalSourcePages, x: 3, y: 28, w: 3, h: 8, minW: 2, minH: 8 },
  { i: WIDGETS.visitedDomains, x: 6, y: 28, w: 3, h: 8, minW: 2, minH: 8 },
  { i: WIDGETS.visitedPages, x: 9, y: 28, w: 3, h: 8, minW: 2, minH: 8 },
];

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: WIDGETS.requestAttribution, x: 0, y: 0, w: 8, h: 12, minW: 6, minH: 8 },
  { i: WIDGETS.qpsChart, x: 8, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
  { i: WIDGETS.requestTrend, x: 8, y: 5, w: 4, h: 7, minW: 3, minH: 6 },
  { i: WIDGETS.clientSource, x: 0, y: 12, w: 4, h: 7, minW: 3, minH: 6 },
  { i: WIDGETS.responseStatus, x: 4, y: 12, w: 4, h: 7, minW: 3, minH: 6 },
  { i: WIDGETS.threatTrend, x: 8, y: 12, w: 4, h: 7, minW: 3, minH: 6 },
  { i: WIDGETS.externalSourceDomains, x: 0, y: 19, w: 3, h: 8, minW: 2, minH: 8 },
  { i: WIDGETS.externalSourcePages, x: 3, y: 19, w: 3, h: 8, minW: 2, minH: 8 },
  { i: WIDGETS.visitedDomains, x: 6, y: 19, w: 3, h: 8, minW: 2, minH: 8 },
  { i: WIDGETS.visitedPages, x: 9, y: 19, w: 3, h: 8, minW: 2, minH: 8 },
];

interface ThreatStats {
  totalRequests: number;
  totalThreats: number;
  blockedRequests: number;
  threatRate: number;
  categoryStats: Record<string, number>;
  severityStats: Record<string, number>;
  topSourceIPs: Array<{ ip: string; threat_count: number }>;
}



const gridItemStyles = css`
  .drag-handle {
    touch-action: none;
  }
  .react-grid-item {
    height: 100%;
  }
`;

export function Dashboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [observations,setObservations]=useState<ObservationMetadata>();
 const [qpsObservations,setQpsObservations]=useState<ObservationMetadata>();
 const [stats, setStats] = useState<ThreatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { layout, handleLayoutChange, containerWidth, containerRef } = useGridLayout({
    storageKey: LAYOUT_STORAGE_KEY,
    defaultLayout: DEFAULT_LAYOUT,
    previousDefaultLayout: PREVIOUS_DEFAULT_LAYOUT,
    widgets: WIDGETS,
  });

  const [protectionOverview, setProtectionOverview] = useState<ClusterHealthResponse['protectionOverview']>();

  // New state for enhanced dashboard
  const [qps, setQps] = useState(0);
  const [qpsPeak, setQpsPeak] = useState(0);
  const [qpsBarData, setQpsBarData] = useState<Array<{ time: number | string; qps: number }>>([]);
  const [requestTrendData, setRequestTrendData] = useState<{ data: Array<{ time: string; requests: number }>; peak: number }>({ data: [], peak: 0 });
  const [threatTrendData, setThreatTrendData] = useState<{ data: Array<{ time: string; threats: number; blocked: number }>; peak: number }>({ data: [], peak: 0 });
  const [protectionCounters, setProtectionCounters] = useState<ProtectionCounters>();
  const [ipSourceStats, setIpSourceStats] = useState<Array<{ ip: string; addressType?: SourceAddressType; country: string; city: string; countryCode: string; requestCount: number; threatCount: number; percentage: string; lat?: number; lng?: number; wafId?: string }>>([]);
  const [wafLocations, setWafLocations] = useState<Array<{ id: string; city: string; country: string; countryCode: string; lat: number; lng: number; requests: number; threats: number; blocked: number; ip?: string }>>([]);
  const [clusterHealth, setClusterHealth] = useState<{
    overallStatus: string;
    components: Array<{
      name: string;
      status: string;
      latency?: number;
      uptime?: string;
      version?: string;
      podStatus?: { ready: number; total: number; overallStatus?: string; notReadyPods?: Array<{ name: string; namespace: string; reason: string; message?: string }> };
    }>;
  }>({ overallStatus: 'healthy', components: [] });
  const [clientSourceValues, setClientSourceData] = useState<{ browser: Array<{ name: string; value: number }>; os: Array<{ name: string; value: number }> }>({ browser: [], os: [] });
  const [responseStatusValues, setResponseStatusData] = useState<{ waf: Array<{ name: string; value: number }>; origin: Array<{ name: string; value: number }> }>({ waf: [], origin: [] });
  const [externalSourceDomains, setExternalSourceDomains] = useState<Array<{ name: string; count: number }>>([]);
  const [externalSourcePages, setExternalSourcePages] = useState<Array<{ name: string; count: number }>>([]);
  const [visitedDomains, setVisitedDomains] = useState<Array<{ name: string; count: number }>>([]);
  const [visitedPages, setVisitedPages] = useState<Array<{ name: string; count: number }>>([]);

  const chartPalette = getChartPalette(isDark);
  const clientSourceData = useMemo(() => ({
    browser: clientSourceValues.browser.map(item => ({ ...item, color: getClientCategoryColor(item.name, 'browser', isDark) })),
    os: clientSourceValues.os.map(item => ({ ...item, color: getClientCategoryColor(item.name, 'os', isDark) })),
  }), [clientSourceValues, isDark]);
  const responseStatusData = useMemo(() => ({
    waf: responseStatusValues.waf.map(item => ({ ...item, color: getResponseStatusColor(item.name, isDark) })),
    origin: responseStatusValues.origin.map(item => ({ ...item, color: getResponseStatusColor(item.name, isDark) })),
  }), [responseStatusValues, isDark]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, clusterHealthData] = await Promise.all([
        dashboardApi.getMetrics('24h').catch(() => null),
        dashboardApi.getClusterHealth().catch(() => null),
      ]);
      setProtectionCounters(metricsData?.protectionCounters);
      if (metricsData) {
 setObservations(metricsData.observability);
        setStats({
          totalRequests: metricsData.totalRequests || 0,
          totalThreats: metricsData.threatRequests || 0,
          blockedRequests: metricsData.blockedRequests || 0,
          threatRate: metricsData.totalRequests > 0 ? metricsData.threatRequests / metricsData.totalRequests : 0,
          categoryStats: {},
          severityStats: {},
          topSourceIPs: [],
        });
        setRequestTrendData({ data: metricsData.requestTrend || [], peak: Math.max(...(metricsData.requestTrend || []).map((d: { requests: number }) => d.requests), 0) });
        setThreatTrendData({
          data: metricsData.threatTrend || [],
          peak: Math.max(...(metricsData.threatTrend || []).map((d: { threats: number }) => d.threats), 0),
        });
        setClientSourceData({
          browser: [...(metricsData.clientSource?.browser || [])].sort((a, b) => b.value - a.value),
          os: [...(metricsData.clientSource?.os || [])].sort((a, b) => b.value - a.value),
        });
        setResponseStatusData({
          waf: [...(metricsData.responseStatus?.waf || [])].sort((a, b) => b.value - a.value),
          origin: [...(metricsData.responseStatus?.origin || [])].sort((a, b) => b.value - a.value),
        });
        setExternalSourceDomains(metricsData.externalSources?.domains || []);
        setExternalSourcePages(metricsData.externalSources?.pages || []);
        setVisitedDomains(metricsData.visited?.domains || []);
        setVisitedPages(metricsData.visited?.pages || []);
        setIpSourceStats((metricsData.ipSources || []).map((item) => ({
          ...item,
          percentage: String(Math.round((item.requestCount / (metricsData.ipSources?.reduce((sum, i) => sum + i.requestCount, 1) || 1)) * 100)),
          wafId: item.wafId,
        })));
        const locations = metricsData.wafLocations?.length
          ? metricsData.wafLocations
          : metricsData.wafLocation ? [{
            id: 'default',
            city: metricsData.wafLocation.city,
            country: metricsData.wafLocation.country,
            countryCode: metricsData.wafLocation.countryCode,
            lat: metricsData.wafLocation.lat,
            lng: (metricsData.wafLocation as WafLocationExtended).lng || (metricsData.wafLocation as WafLocationExtended).lon || 0,
            requests: 0,
            threats: 0,
            blocked: 0,
            status: metricsData.wafLocation.status,
            ip: (metricsData.wafLocation as WafLocationExtended).ip,
          }] : [];
        setWafLocations(locations.map((w) => ({
          id: w.id || 'default',
          city: w.city || '',
          country: w.country || '',
          countryCode: w.countryCode || '',
          lat: w.lat || 0,
          lng: (w as WafLocationExtended).lng || (w as WafLocationExtended).lon || 0,
          requests: w.requests || 0,
          threats: w.threats || 0,
          blocked: w.blocked || 0,
          ip: (w as WafLocationExtended).ip,
        })));
      }
      if (clusterHealthData) {
        setClusterHealth(clusterHealthData);
        setProtectionOverview(clusterHealthData.protectionOverview);
      } else {
        setProtectionOverview(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    // QPS polling interval (every 5 seconds, 36 points = 3 minutes)
    const refreshQPS = async () => {
      try {
        const qpsData = await dashboardApi.getQPS();
        setQpsObservations(qpsData.observability);
 setQps(qpsData.currentQPS);
        setQpsPeak(qpsData.peakQPS);
        setQpsBarData(qpsData.barData || []);
      } catch {
        // silently fail, keep previous data
      }
    };
    void refreshQPS();
    const qpsInterval = setInterval(refreshQPS, 5000);
    return () => {
      clearInterval(interval);
      clearInterval(qpsInterval);
    };
  }, [fetchData, t]);

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const entryCount = protectionOverview?.entrySource === 'available' ? protectionOverview.entryCount ?? '—' : '—';
  const businessServiceCount = protectionOverview?.serviceSource === 'available' ? protectionOverview.businessServiceCount ?? '—' : '—';
  const entryDetails = protectionOverview?.entrySource === 'available'
    ? [
      ['Ingress', protectionOverview.ingressCount ?? '—'],
      ['Gateway', protectionOverview.gatewayCount ?? '—'],
      [t('dashboard.stats.directServices'), protectionOverview.externalServiceCount ?? '—'],
    ] as const
    : undefined;
  const podBreakdown = protectionOverview?.podSource === 'available'
    ? t('dashboard.stats.podBreakdown', { ready: protectionOverview.readyPodCount ?? '—', total: protectionOverview.podCount ?? '—' })
    : t('dashboard.stats.podsUnavailable');

  return (
    <>
      <Global styles={gridItemStyles} />
      <Box>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Page Title */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
              <DashboardIcon sx={{ color: colors.primary.main }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {t('dashboard.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.subtitle')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <ObservationNotice metadata={observations} />
 <ObservationNotice metadata={qpsObservations} />
 {/* Static Stat Cards - 3 Groups */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Group 1: Entry resources, associated Services and Pod instances */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
            <Card sx={summaryCardSx}>
              <CardContent sx={summaryCardContentSx}>
                <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#1D2129', fontWeight: 600, mb: 1.5 }}>
                  {t('dashboard.stats.entryBusinessScale')}
                </Typography>
                <Box sx={summaryMetricsSx}>
                  <Tooltip
                    describeChild
                    title={
                      <Box sx={{ py: 0.5 }}>
                        {entryDetails ? entryDetails.map(([label, count]) => (
                          <Typography key={label} variant="caption" sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, lineHeight: 1.6 }}>
                            <Box component="span">{label}</Box><Box component="span" sx={{ fontWeight: 600 }}>{count}</Box>
                          </Typography>
                        )) : <Typography variant="caption">{t('dashboard.stats.inventoryUnavailable')}</Typography>}
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', lineHeight: 1.4 }}>{t('dashboard.stats.entryScaleHint')}</Typography>
                      </Box>
                    }
                    placement="right"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 400, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 8, border: '1px solid', borderColor: 'divider' } } }}
                  >
                    <Box tabIndex={0} sx={{ minWidth: 0, cursor: 'help' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: isDark ? colors.statCard.info.bg.dark : colors.statCard.info.bg.light, width: 36, height: 36 }}>
                          <WebIcon sx={{ color: isDark ? colors.statCard.info.color.dark : colors.statCard.info.color.light, fontSize: 20 }} />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">{t('dashboard.stats.entryResources')}</Typography>
                          <Typography variant="h6" fontWeight="bold" sx={{ color: isDark ? colors.statCard.info.color.dark : colors.statCard.info.color.light }}>{entryCount}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Tooltip>
                  <Tooltip
                    describeChild
                    title={
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.6 }}>{podBreakdown}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', lineHeight: 1.4 }}>{t('dashboard.stats.businessScaleHint')}</Typography>
                      </Box>
                    }
                    placement="right"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 400, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 8, border: '1px solid', borderColor: 'divider' } } }}
                  >
                    <Box tabIndex={0} sx={{ minWidth: 0, cursor: 'help' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: isDark ? colors.statCard.info.bg.dark : colors.statCard.info.bg.light, width: 36, height: 36 }}>
                          <SecurityIcon sx={{ color: isDark ? colors.statCard.info.color.dark : colors.statCard.info.color.light, fontSize: 20 }} />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">{t('dashboard.stats.businessServices')}</Typography>
                          <Typography variant="h6" fontWeight="bold" sx={{ color: isDark ? colors.statCard.info.color.dark : colors.statCard.info.color.light }}>{businessServiceCount}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Group 2: Blocking actions with source details on hover. */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
            <ProtectionCountersCard counters={protectionCounters} />
          </Grid>

          {/* Group 3: Cluster Status */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
            <Card sx={summaryCardSx}>
              <CardContent sx={summaryCardContentSx}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#1D2129', fontWeight: 600 }}>
                    {t('dashboard.stats.clusterStatus')}
                  </Typography>
                  {(() => {
                    const severity: Record<string, number> = { down: 3, degraded: 2, healthy: 1 };
                    const worst = clusterHealth.components.reduce((acc, c) => {
                      const s = c.status || 'healthy';
                      return (severity[s] || 0) > (severity[acc] || 0) ? s : acc;
                    }, 'healthy');
                    return <CommonChip type="status" value={worst} size="small" />;
                  })()}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2 }}>
                  {/* K8s Pod Status */}
                  {(() => {
                    const k8sComponent = clusterHealth.components.find(c => c.name === 'Kubernetes API');
                    const podStatus = k8sComponent?.podStatus;
                    const ready = podStatus?.ready ?? 0;
                    const total = podStatus?.total ?? 0;
                    const notReadyPods = podStatus?.notReadyPods ?? [];
                    const k8sOverall = k8sComponent?.podStatus?.overallStatus ?? 'down';
                    const hasNotReady = notReadyPods.length > 0;
                    const dotColor = k8sOverall === 'down'
                      ? (isDark ? colors.error.dark : colors.error.light)
                      : k8sOverall === 'degraded'
                        ? (isDark ? colors.warning.dark : colors.warning.light)
                        : (isDark ? colors.success.dark : colors.success.light);

                    const podStatusBox = (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: hasNotReady ? 'help' : 'default',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: dotColor,
                        mr: 0.5
                      }} />
                      <Typography variant="caption" color="text.secondary">{t('dashboard.stats.readyPods')}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {ready}/{total}
                    </Typography>
                  </Box>
                    );

                    return hasNotReady ? (
                      <Tooltip
                        title={
                          <Box sx={{ py: 0.5 }}>
                            {notReadyPods.map(pod => (
                              <Typography key={pod.name} variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
                                {pod.namespace && <Box component="span" sx={{ opacity: 0.6 }}>{pod.namespace}/</Box>}{pod.name}: {pod.reason}{pod.message ? ` — ${pod.message}` : ''}
                              </Typography>
                            ))}
                          </Box>
                        }
                        placement="right"
                        arrow
                        slotProps={{ tooltip: { sx: { maxWidth: 400, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 8, border: '1px solid', borderColor: 'divider' } } }}
                      >
                        {podStatusBox}
                      </Tooltip>
                    ) : podStatusBox;
                  })()}
                  {/* Component Status */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {clusterHealth.components.slice(0, 3).map((component) => (
                      <Box key={component.name} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1,
                        py: 0.25,
                        borderRadius: 0.5,
                        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      }}>
                        <Box sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: component.status === 'healthy' ? (isDark ? colors.success.dark : colors.success.light) : component.status === 'degraded' ? (isDark ? colors.warning.dark : colors.warning.light) : (isDark ? colors.error.dark : colors.error.light),
                        }} />
                        <Typography variant="caption" fontWeight="500" sx={{ flex: 1 }}>
                          {CLUSTER_COMPONENT_LABELS[component.name] ? t(CLUSTER_COMPONENT_LABELS[component.name]) : component.name}
                        </Typography>
                        {component.latency !== undefined && (
                          <Typography variant="caption" color="text.secondary">{component.latency}ms</Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Draggable Grid Layout */}
        <Box ref={containerRef} id="dashboard-grid-container" sx={{ mb: 3, width: '100%', minWidth: 0 }}>
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={ROW_HEIGHT}
            width={containerWidth}
            style={{ visibility: containerWidth > 0 ? 'visible' : 'hidden' }}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            isResizable
            autoSize
          >
            {/* QPS Bar Chart with 1s aggregation */}
            <div key={WIDGETS.qpsChart}>
              <DraggableCard
                title={t('dashboard.charts.qpsChart')}
                badge={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: isDark ? colors.statCard.info.bg.dark : colors.statCard.info.bg.light, width: 28, height: 28 }}>
                      <SpeedIcon sx={{ color: isDark ? colors.statCard.info.color.dark : colors.statCard.info.color.light, fontSize: 18 }} />
                    </Avatar>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {displayObserved(qps,qpsObservations,"currentQPS")} /s
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Peak: {displayObserved(qpsPeak,qpsObservations,"peakQPS")}
                      </Typography>
                    </Box>
                  </Box>
                }
              >
                <EQpsHistogram data={qpsBarData} height={120} />
              </DraggableCard>
            </div>

            {/* Threat Trend with peak annotation */}
            <div key={WIDGETS.threatTrend}>
              <DraggableCard
                title={t('dashboard.charts.threatTrend')}
                badge={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isDark ? colors.chart.warning.dark : colors.chart.warning.light }} />
                        <Typography variant="caption" color="text.secondary">{t('threat.chartNames.threatCount')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isDark ? colors.chart.blocked.dark : colors.chart.blocked.light }} />
                        <Typography variant="caption" color="text.secondary">{t('threat.chartNames.blockedCount')}</Typography>
                      </Box>
                    </Box>
                    <Chip label={`Peak: ${threatTrendData.peak}`} size="small" sx={{ bgcolor: isDark ? colors.chipBg.default.dark : colors.chipBg.default.light, fontSize: 10 }} />
                  </Box>
                }
              >
                <EAreaChart
                  data={threatTrendData.data}
                  series={[
                    { dataKey: 'threats', name: t('threat.chartNames.threatCount'), colorKey: 'warning' },
                    { dataKey: 'blocked', name: t('threat.chartNames.blockedCount'), colorKey: 'blocked' },
                  ]}
                  peak={threatTrendData.peak}
                />
              </DraggableCard>
            </div>

            {/* Request Trend with peak annotation */}
            <div key={WIDGETS.requestTrend}>
              <DraggableCard
                title={t('dashboard.charts.requestTrend')}
                badge={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isDark ? colors.chart.primary.dark : colors.chart.primary.light }} />
                    <Typography variant="caption" color="text.secondary">{t('dashboard.table.requests')}</Typography>
                    <Chip label={`Peak: ${requestTrendData.peak}`} size="small" sx={{ bgcolor: isDark ? colors.chipBg.default.dark : colors.chipBg.default.light, fontSize: 10 }} />
                  </Box>
                }
              >
                <EAreaChart
                  data={requestTrendData.data}
                  series={[
                    { dataKey: 'requests', name: t('dashboard.table.requests'), colorKey: 'primary' },
                  ]}
                  peak={requestTrendData.peak}
                />
              </DraggableCard>
            </div>

            {/* Client Source Nightingale Chart (outer: browser, inner: OS) */}
            <div key={WIDGETS.clientSource}>
              <DraggableCard
                title={t('dashboard.charts.clientSource')}
              >
                <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', alignItems: 'center', px: 1, justifyContent: 'space-around' }}>
                  <ENightingaleChart
                    outerData={clientSourceData.browser}
                    innerData={clientSourceData.os}
                    outerName="Browser"
                    innerName="OS"
                    height={140}
                    width={140}
                  />
                  <Box sx={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      {/* Left column: Inner OS */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">OS</Typography>
                        {clientSourceData.os.map((entry) => (
                          <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                            <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.65rem' }}>{entry.name}</Typography>
                            <Typography variant="caption" fontWeight="500" sx={{ fontSize: '0.65rem' }}>{formatShare(entry.value, clientSourceData.os)}</Typography>
                          </Box>
                        ))}
                      </Box>
                      {/* Right column: Outer Browser */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">Browser</Typography>
                        {clientSourceData.browser.map((entry) => (
                          <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                            <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.65rem' }}>{entry.name}</Typography>
                            <Typography variant="caption" fontWeight="500" sx={{ fontSize: '0.65rem' }}>{formatShare(entry.value, clientSourceData.browser)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </DraggableCard>
            </div>

            {/* Response Status Nightingale Chart (outer: WAF, inner: Origin) */}
            <div key={WIDGETS.responseStatus}>
              <DraggableCard
                title={t('dashboard.charts.responseStatus')}
              >
                <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', alignItems: 'center', px: 1, justifyContent: 'space-around' }}>
                  <ENightingaleChart
                    outerData={responseStatusData.waf}
                    innerData={responseStatusData.origin}
                    outerName="WAF"
                    innerName="Origin"
                    height={140}
                    width={140}
                  />
                  <Box sx={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      {/* Left column: Inner Origin */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">Origin</Typography>
                        {responseStatusData.origin.map((entry) => (
                          <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                            <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.65rem' }}>{entry.name}</Typography>
                            <Typography variant="caption" fontWeight="500" sx={{ fontSize: '0.65rem' }}>{formatShare(entry.value, responseStatusData.origin)}</Typography>
                          </Box>
                        ))}
                      </Box>
                      {/* Right column: Outer WAF */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">WAF</Typography>
                        {responseStatusData.waf.map((entry) => (
                          <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                            <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.65rem' }}>{entry.name}</Typography>
                            <Typography variant="caption" fontWeight="500" sx={{ fontSize: '0.65rem' }}>{formatShare(entry.value, responseStatusData.waf)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </DraggableCard>
            </div>

            {/* External Source Domains Top5 Horizontal Bar */}
            <div key={WIDGETS.externalSourceDomains}>
              <DraggableCard title={t('dashboard.charts.externalSourceDomains')}>
                <EHorizontalBar
                  data={externalSourceDomains}
                  color={chartPalette[0]}
                />
              </DraggableCard>
            </div>

            {/* External Source Pages Top5 Horizontal Bar */}
            <div key={WIDGETS.externalSourcePages}>
              <DraggableCard title={t('dashboard.charts.externalSourcePages')}>
                <EHorizontalBar
                  data={externalSourcePages}
                  color={chartPalette[1]}
                />
              </DraggableCard>
            </div>

            {/* Visited Domains Top5 Horizontal Bar */}
            <div key={WIDGETS.visitedDomains}>
              <DraggableCard title={t('dashboard.charts.visitedDomains')}>
                <EHorizontalBar
                  data={visitedDomains}
                  color={chartPalette[2]}
                />
              </DraggableCard>
            </div>

            {/* Visited Pages Top5 Horizontal Bar */}
            <div key={WIDGETS.visitedPages}>
              <DraggableCard title={t('dashboard.charts.visitedPages')}>
                <EHorizontalBar
                  data={visitedPages}
                  color={chartPalette[3]}
                />
              </DraggableCard>
            </div>

            {/* Request Attribution Map (Cloudflare-style) */}
            <div key={WIDGETS.requestAttribution}>
              <DraggableCard title={t('dashboard.charts.requestAttribution') || 'Request Attribution'}>
                <Box sx={{ width: '100%', height: '100%' }}>
                  <RequestAttributionMap
                    data={ipSourceStats.map(s => ({
                      ip: s.ip,
                      addressType: s.addressType,
                      country: s.country,
                      countryCode: s.countryCode || '',
                      city: s.city || '',
                      requestCount: s.requestCount,
                      threatCount: s.threatCount,
                      lat: s.lat || 0,
                      lng: s.lng || 0,
                      wafId: s.wafId,
                    }))}
                    wafLocations={wafLocations}
                  />
                </Box>
              </DraggableCard>
            </div>

          </GridLayout>
        </Box>
      </Box>
    </>
  );
}
