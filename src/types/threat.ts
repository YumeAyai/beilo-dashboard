export type SourceAddressType = 'public' | 'private' | 'loopback' | 'link_local' | 'shared' | 'multicast' | 'unspecified' | 'reserved' | 'invalid';

import type { ObservationMetadata } from "./observability";
// Threat types for threat monitoring page

export interface SystemStatus {
  auto_inject_enabled: boolean;
  threat_detection_enabled: boolean;
  blocked_ips_count: number;
  namespace: string;
  version: string;
  loki_enabled: boolean;
  loki_connected: boolean;
  redis_enabled: boolean;
  redis_connected: boolean;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
  labels?: Record<string, string>;
}

export interface ThreatEvent {
  id: string;
  timestamp: string;
  sourceIP: string;
  url: string;
  method: string;
  threatType: string;
  threatCategory: string;
  severity: string;
  statusCode: number;
  userAgent: string;
  action: string;
  attackTypes?: string[];
  ruleIDs?: string[];
  ruleTags?: string[];
  ruleMessages?: string[];
}

export interface ThreatStatistics {
  totalRequests: number;
  totalThreats: number;
  blockedRequests: number;
  threatRate: number;
  categoryStats: Record<string, number>;
  severityStats: Record<string, number>;
  topSourceIPs: SourceIPStats[];
  topTargetURLs: TargetURLStats[];
  recentEvents: ThreatEvent[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface SourceIPStats {
  ip: string;
  threatCount: number;
  requestCount: number;
  blockedCount: number;
  lastActivity: string;
  country?: string;
  isp?: string;
}

export interface TargetURLStats {
  url: string;
  threatCount: number;
  requestCount: number;
  topThreatType: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  threatCount: number;
  blockedCount: number;
}

export interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt: string;
  blockedCount: number;
}

export interface ThreatReport {
  events: ThreatEvent[];
  topThreats: Record<string, number>;
  topSources: Record<string, number>;
  totalEvents: number;
  timeRange: string;
  startTime: string;
  endTime: string;
}

export interface ThreatQueryParams {
  duration?: string;
  limit?: number;
  severity?: string;
  threatType?: string;
}

export interface ApiResponse {
  status: string;
  message: string;
}

// Dashboard enhancement types
export interface QPSData {
  current: number;
  average: number;
  peak: number;
  timestamp: string;
}

export interface IPSourceStats {
  ip: string;
  country: string;
  city: string;
  countryCode: string;
  requestCount: number;
  threatCount: number;
  percentage: number;
}

export interface ClusterComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency?: number;
  uptime?: string;
  version?: string;
}

export interface ClusterHealth {
  overallStatus: 'healthy' | 'degraded' | 'down';
  components: ClusterComponent[];
}

// Aggregation API types
export interface AggregationNodeInfo {
  name: string;
  ip: string;
  podCount: number;
  ready: boolean;
  age: string;
  conditions: Record<string, boolean>;
}

export interface AggregationClusterSummary {
  nodeCount: number;
  podCount: number;
  serviceCount: number;
  namespaces: string[];
  wafNodeIP: string;
  health: {
    status: string;
    components: Array<{
      name: string;
      status: string;
      error?: string;
    }>;
  };
  nodes: AggregationNodeInfo[];
  lastSync: string;
  stale: boolean;
}

export interface AggregationGeoInfo {
  country: string;
  city: string;
  region: string;
  isp: string;
  lat: number;
  lng: number;
}

export interface AggregationAttackSource {
  sourceIP: string;
  location?: AggregationGeoInfo;
  threatCount: number;
  requestCount: number;
  blockedCount: number;
  status: 'Blocked' | 'Allowed' | 'Monitored';
  topThreatTypes: string[];
  firstSeen: string;
  lastSeen: string;
  blocked: boolean;
}

export interface AggregationServiceRisk {
  serviceName: string;
  namespace: string;
  riskScore: number;
  threatCount: number;
  topThreats: string[];
  recentAttack: boolean;
}

export interface AggregationThreatSummary {
  totalEvents: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topCategories: Record<string, number>;
  highRiskIPs: AggregationAttackSource[];
  blockedIPCount?: number;
}

export interface AggregationRequestSummary {
  totalRequests: number;
  blockedRequests: number;
  requestTrend: Array<{
    timestamp: string;
    value: number;
  }>;
  topSources: AggregationAttackSource[];
}

export interface AggregationAttackEvent {
  id: string;
  timestamp: string;
  sourceIP: string;
  sourceLocation?: AggregationGeoInfo;
  attackType: string;
  attackTypes?: string[];
  ruleTags?: string[];
  ruleMessages?: string[];
  severity: string;
  targetService: string;
  targetNamespace: string;
  targetPod?: string;
  targetNode?: string;
  action: string;
  ruleIDs: string[];
  method?: string;
  url?: string;
  userAgent?: string;
  matchedData?: string;
}

export interface AggregationServiceContext {
  serviceName: string;
  namespace: string;
  clusterIP: string;
  ports: number[];
  podCount: number;
  requestCount: number;
  threatCount: number;
  blockedCount: number;
  topThreats: string[];
  recentAttacks: AggregationAttackEvent[];
  associatedPods: Array<{
    name: string;
    namespace: string;
    ip: string;
    node: string;
    nodeIP: string;
    ready: string;
    age: string;
  }>;
  lastSync: string;
  stale: boolean;
}

export interface AggregationUnifiedDashboard {
  timestamp: string;
  lastSync: string;
  cluster: AggregationClusterSummary;
  threats: AggregationThreatSummary;
  requests: AggregationRequestSummary;
  topAttackers: AggregationAttackSource[];
  highRiskServices: AggregationServiceRisk[];
  threatTrend: Array<{ time: string; threats: number; blocked: number }>;
  stale: boolean;
}

export interface AggregationAttackEventsResponse {
  total: number;
  limit: number;
  events: AggregationAttackEvent[];
}

export interface AggregationMetricsResponse {
 observability?: ObservationMetadata;
  timestamp: string;
  lastSync: string;
  totalRequests: number;
  threatRequests: number;
  unblockedThreats?: number;
  blockedRequests: number;
  blockedIPCount: number | null;
  threatTrend: Array<{ time: string; threats: number; blocked: number }>;
  threatEvents: AggregationAttackEvent[];
  topAttackers: AggregationAttackSource[];
  threatLevel: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}
