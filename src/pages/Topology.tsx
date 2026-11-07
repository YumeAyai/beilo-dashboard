import { HubbleIcon } from '../components/Topology/HubbleIcon';
import {
  Avatar,
  Box,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeHubbleLayout } from '../components/ServiceMap/service-map/layout';

import { TopologyWorkspace } from '../components/Topology/TopologyWorkspace';
import { FlowGraphHistory } from '../components/Topology/graphHistory';
import { buildHubbleGraph, selectHubbleFlows } from '../components/Topology/graphData';
import { hubbleFlowToFlowData } from '../components/Topology/flowData';
import { collectFlowFilterSuggestions, createFlowFilter, flowFilterKey, type FlowFilter, type FlowFilterDirection, type FlowFilterKind } from '../components/Topology/flowFilters';
import { topologyApi } from '../services/api';
import { colors } from '../theme/colors';
import type { HubbleFlow } from '../types/hubble';

// Import Hubble-style components
import type { FlowData, ServiceCardData } from '../components/Topology';
import {
  FlowDetailsPanel,
  FlowsTable,
  ServiceMapCanvas,
  TopBar,
} from '../components/Topology';

// Main Topology Component
export function Topology() {
  const { t } = useTranslation();

  // State
  const [loading, setLoading] = useState(true);
  const [namespaceFilter, setNamespaceFilter] = useState('default');
  const [allNamespaces, setAllNamespaces] = useState<string[]>(['default']);
  const [flowFilters, setFlowFilters] = useState<FlowFilter[]>([]);
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [httpStatusFilter, setHttpStatusFilter] = useState('');

  // Visual filter toggles
  const [showHost, setShowHost] = useState(false);
  const [showKubeDns, setShowKubeDns] = useState(false);
  const [showRemoteNode, setShowRemoteNode] = useState(false);
  const [showPrometheusApp, setShowPrometheusApp] = useState(false);

  // Resource metadata enriches collected endpoints; it never creates a graph.
  const [metadataNodes, setMetadataNodes] = useState<Array<{ id: string; data: ServiceCardData }>>([]);
  const [observedFlows, setObservedFlows] = useState<HubbleFlow[]>([]);
  const [graphFlows, setGraphFlows] = useState<HubbleFlow[]>([]);
  const graphHistory = useRef(new FlowGraphHistory());
  const graphDirty = useRef(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [showFlowDetails, setShowFlowDetails] = useState(false);

  // Selected node for highlighting
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Stats and connection state
  const [stats, setStats] = useState<Awaited<ReturnType<typeof topologyApi.getStatus>> | null>(null);
  const [connectionState, setConnectionState] = useState<'receiving' | 'reconnecting' | 'stopped' | 'idle'>('idle');
  const [flowsDiffCount, setFlowsDiffCount] = useState(0);
  const diffCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowsBufferRef = useRef<HubbleFlow[]>([]);
  const flowsFlushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hubble status is relay-wide and does not change with namespace/Visual filters.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const status = await topologyApi.getStatus();
        if (!cancelled) setStats(status);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) timer = setTimeout(() => { void poll(); }, 5000);
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // Fetch namespaces on mount
  useEffect(() => {
    topologyApi
      .getNamespaces()
      .then((namespaces) => {
        if (namespaces.length > 0) {
          setAllNamespaces(['all', ...namespaces]);
          setNamespaceFilter(previous => previous === 'all' || namespaces.includes(previous) ? previous : namespaces[0]);
        }
      })
      .catch(console.error);
  }, []);

  const topologyRequestVersion = useRef(0);
  const rawFlows = useRef<HubbleFlow[]>([]);

  // Fetch topology data
  const fetchTopology = useCallback(async () => {
    const requestVersion = ++topologyRequestVersion.current;
    setLoading(true);
    rawFlows.current = [];
    flowsBufferRef.current = [];
    setObservedFlows([]);
    graphHistory.current.clear();
    graphDirty.current = false;
    setGraphFlows([]);
    setMetadataNodes([]);

    try {
      const ns = namespaceFilter === 'all' ? undefined : namespaceFilter;
      const [metadata, sample] = await Promise.allSettled([
        topologyApi.getTopology(ns), topologyApi.getFlows(ns ?? '', 500),
      ]);
      if (requestVersion !== topologyRequestVersion.current) return;
      if (sample.status === 'rejected') throw sample.reason;
      const flowsData = sample.value || [];
      const topologyData = metadata.status === 'fulfilled' && metadata.value ? metadata.value : { nodes: [], edges: [] };

      // Process nodes
      const nsSet = new Set<string>();
      const processedNodes = (topologyData.nodes || []).map((node) => {
        nsSet.add(node.namespace);
        const nodeName = node.label?.toLowerCase() || '';
        const nodeLabels: string[] = node.labels || [];

        let nodeType: ServiceCardData['type'] = (node.type as ServiceCardData['type']) || 'service';
        let isWorld = false;
        let isHost = false;
        let domain: string | undefined;

        const hasReservedHost =
          node.type === 'host' || nodeName === 'host' ||
          nodeName.includes('reserved:host') ||
          nodeLabels.some((l: string) => l.includes('reserved:host'));
        const hasReservedWorld =
          node.type === 'world' || nodeName === 'world' ||
          nodeName.includes('reserved:world') ||
          nodeLabels.some(
            (l: string) =>
              l.includes('reserved:world') ||
              l.includes('reserved:world-ipv4') ||
              l.includes('reserved:world-ipv6')
          );

        if (hasReservedHost) {
          nodeType = 'host';
          isHost = true;
        } else if (hasReservedWorld) {
          nodeType = 'world';
          isWorld = true;
          const dnsLabel = nodeLabels.find(
            (l: string) => l.includes('dns-names') || l.includes('io.cilium.dns-names')
          );
          if (dnsLabel) {
            const match = dnsLabel.match(/[:=]\s*(.+)$/);
            if (match) {
              domain = match[1].split(',')[0].trim();
            }
          }
          if (!domain && nodeName.includes('.')) {
            domain = node.label;
          }
        } else if (nodeName.includes('kube-dns') || nodeName.includes('coredns')) {
          nodeType = 'database';
        }

        return {
          id: node.id,
          label: node.label,
          namespace: node.namespace,
          type: nodeType,
          ports: [],
          accessPoints: node.accessPoints?.filter(ap => /^(TCP|UDP)$/i.test(ap.protocol)).map(ap => ({
            port: ap.port, protocol: ap.protocol.toUpperCase() as 'TCP' | 'UDP', l7Protocol: ap.l7proto,
          })),
          pods: node.pods,
          isExternal: nodeType === 'external' || isWorld,
          isWorld,
          isHost,
          domain,
          labels: nodeLabels.map((l: string) => {
            const parts = l.split('=');
            return { key: parts[0], value: parts.slice(1).join('=') };
          }),
        };
      });

      setMetadataNodes(processedNodes.map(data => ({ id: data.id, data })));
      rawFlows.current = [...rawFlows.current, ...flowsData].slice(0, 500);
      setObservedFlows(rawFlows.current);
      if (graphHistory.current.ingest(flowsData)) setGraphFlows(graphHistory.current.snapshot());

      // Update namespaces
      setAllNamespaces((prev) => {
        const newNs = Array.from(nsSet).filter(Boolean);
        const merged = [...new Set(['all', ...prev, ...newNs])];
        return merged;
      });

    } catch (err) {
      if (requestVersion !== topologyRequestVersion.current) return;
      // A bounded snapshot may time out in an inactive namespace. Keep the
      // graph empty and let the authenticated live stream continue, like Hubble.
      console.warn(err);
    } finally {
      if (requestVersion === topologyRequestVersion.current) setLoading(false);
    }
  }, [namespaceFilter]);

  // Use streaming SSE for flows instead of polling
  useEffect(() => {
    let eventSource: { close(): void } | null = null;
    let active = true;

    setSelectedNodeId(null);
    setSelectedFlowId(null);
    setShowFlowDetails(false);
    flowsBufferRef.current = [];
    void fetchTopology();

    // Set up SSE stream for real-time flows
    eventSource = topologyApi.streamFlows(
      namespaceFilter === 'all' ? '' : namespaceFilter,
      500,
      (flow) => {
        if (!active) return;
        setConnectionState('receiving');
        setFlowsDiffCount(prev => Math.min(prev + 1, 99));
        if (diffCountTimerRef.current) clearTimeout(diffCountTimerRef.current);
        diffCountTimerRef.current = setTimeout(() => setFlowsDiffCount(0), 5000);
        // Topology observations must enter the connection store BEFORE the
        // bounded packet buffer. A burst must not evict a rare connection.
        if (graphHistory.current.ingest([flow])) graphDirty.current = true;
        // Buffer table rows instead of triggering a state update per event.
        flowsBufferRef.current = [flow, ...flowsBufferRef.current].slice(0, 500);
      },
      (state) => {
        if (!active) return;
        setConnectionState(state);
        // Hubble retains its frame across retry/quiet periods. Reconnecting
        // describes transport state, not deletion of observed services/links.
        if (state === 'stopped') {
          rawFlows.current = [];
          flowsBufferRef.current = [];
          setObservedFlows([]);
          graphHistory.current.clear();
          graphDirty.current = false;
          setGraphFlows([]);
        }
      },
    );

    // Flush buffer to state every 500ms
    flowsFlushTimerRef.current = setInterval(() => {
      if (flowsBufferRef.current.length === 0) return;
      const buffered = flowsBufferRef.current;
      flowsBufferRef.current = [];
      rawFlows.current = [...buffered, ...rawFlows.current].slice(0, 500);
      setObservedFlows(rawFlows.current);
      if (graphDirty.current) {
        graphDirty.current = false;
        setGraphFlows(graphHistory.current.snapshot());
      }
    }, 500);

    return () => {
      active = false;
      topologyRequestVersion.current += 1;
      if (eventSource) eventSource.close();
      if (flowsFlushTimerRef.current) clearInterval(flowsFlushTimerRef.current);
      if (diffCountTimerRef.current) clearTimeout(diffCountTimerRef.current);
    };
  }, [namespaceFilter, fetchTopology]);

  // Connection history intentionally coalesces packet flags. Include recent
  // packets while filtering so a collected SYN/IP/DNS match also reaches the map.
  const hasFlowFilters = flowFilters.length > 0;
  const filterSourceFlows = useMemo(() => hasFlowFilters ? [...new Set([...graphFlows, ...observedFlows])] : graphFlows, [graphFlows, observedFlows, hasFlowFilters]);
  const visibleHubbleFlows = useMemo(() => selectHubbleFlows(filterSourceFlows, {
    showHost, showKubeDns, showRemoteNode, showPrometheusApp,
    flowFilters, verdictFilter, httpStatus: httpStatusFilter,
  }), [filterSourceFlows, showHost, showKubeDns, showRemoteNode, showPrometheusApp, flowFilters, verdictFilter, httpStatusFilter]);
  const filterSuggestions = useMemo(() => collectFlowFilterSuggestions([...graphFlows, ...observedFlows]), [graphFlows, observedFlows]);
  const graph = useMemo(() => buildHubbleGraph(metadataNodes, visibleHubbleFlows), [metadataNodes, visibleHubbleFlows]);
  const topologyNodes = useMemo(() => computeHubbleLayout(graph.nodes, graph.edges, namespaceFilter === 'all' ? '' : namespaceFilter), [graph, namespaceFilter]);
  const topologyEdges = graph.edges;
  const flows = useMemo(() => selectHubbleFlows(observedFlows, {
    showHost, showKubeDns, showRemoteNode, showPrometheusApp,
    flowFilters, verdictFilter, httpStatus: httpStatusFilter,
  }).map(hubbleFlowToFlowData), [observedFlows, showHost, showKubeDns, showRemoteNode, showPrometheusApp, flowFilters, verdictFilter, httpStatusFilter]);

  // Compute highlighted node IDs based on selected node
  const highlightedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();

    const ids = new Set<string>([selectedNodeId]);
    topologyEdges.forEach((e) => {
      if (e.source === selectedNodeId) ids.add(e.target);
      if (e.target === selectedNodeId) ids.add(e.source);
    });

    return ids;
  }, [selectedNodeId, topologyEdges]);

  // Handlers
  const handleNodeClick = useCallback((nodeData: ServiceCardData) => {
    setSelectedNodeId((prev) => (prev === nodeData.id ? null : nodeData.id));
    const label = nodeData.labels?.find(label => label.key.startsWith('reserved:'));
    const filter = nodeData.identity !== undefined ? createFlowFilter('identity', String(nodeData.identity))
      : nodeData.domain ? createFlowFilter('dns', nodeData.domain)
        : label ? createFlowFilter('label', label.value ? `${label.key}=${label.value}` : label.key) : null;
    if (!filter) return;
    const key = flowFilterKey(filter);
    setFlowFilters(previous => previous.some(item => flowFilterKey(item) === key)
      ? previous.filter(item => flowFilterKey(item) !== key) : [...previous, filter]);
  }, []);

  const filterFromDetails = useCallback((kind: FlowFilterKind, query: string, direction: FlowFilterDirection = 'either') => {
    setSelectedNodeId(null);
    setFlowFilters(query ? [createFlowFilter(kind, query, direction)] : []);
  }, []);

  const handlePaneClick = useCallback(() => {
    setShowFlowDetails(false);
    setSelectedFlowId(null);
    setSelectedNodeId(null);
  }, []);

  const handleFlowSelect = useCallback((flow: FlowData) => {
    setSelectedFlowId(flow.id);
    setShowFlowDetails(true);
  }, []);

  const handleFlowDetailsClose = useCallback(() => {
    setShowFlowDetails(false);
    setSelectedFlowId(null);
  }, []);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) || null;

  return (
    <Box
      sx={{
        height: 'calc(100vh - 100px)',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Page Title */}
      <Box sx={{ mb: 1, position: 'relative', zIndex: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: colors.primary.main + '15' }}>
            <HubbleIcon name="graph" sx={{ color: colors.primary.main }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="600">
              {t('topology.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('topology.subtitle')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Page content - Full-screen SVG Canvas (background layer) */}
      <Box sx={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 1,
        overflow: 'hidden',
      }}>

        {/* Filters take their actual height when controls wrap. */}
        <Box sx={{ flexShrink: 0, mx: 1, mb: 1, zIndex: 10 }}>
          <TopBar
            namespaceFilter={namespaceFilter}
            allNamespaces={allNamespaces}
            onNamespaceChange={setNamespaceFilter}
            flowFilters={flowFilters}
            filterSuggestions={filterSuggestions}
            onFiltersChange={filters => { setFlowFilters(filters); setSelectedNodeId(null); }}
            verdictFilter={verdictFilter}
            onVerdictChange={setVerdictFilter}
            httpStatus={httpStatusFilter}
            onHttpStatusChange={setHttpStatusFilter}
            stats={stats}
            connectionState={connectionState}
            onRefresh={fetchTopology}
            loading={loading}
            showHost={showHost}
            onShowHostToggle={() => setShowHost(v => !v)}
            showKubeDns={showKubeDns}
            onShowKubeDnsToggle={() => setShowKubeDns(v => !v)}
            showRemoteNode={showRemoteNode}
            onShowRemoteNodeToggle={() => setShowRemoteNode(v => !v)}
            showPrometheusApp={showPrometheusApp}
            onShowPrometheusAppToggle={() => setShowPrometheusApp(v => !v)}
            flowsDiffCount={flowsDiffCount}
          />
        </Box>

        <TopologyWorkspace canvas={
          <ServiceMapCanvas
            nodes={topologyNodes}
            edges={topologyEdges}
            loading={loading}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            namespaceFilter={namespaceFilter}
          />
        }>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              zIndex: 10,
              minHeight: 0,
              flexDirection: 'column',
            }}
          >
            {/* Flows Table */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <FlowsTable
                flows={flows}
                loading={loading}
                selectedFlowId={selectedFlowId}
                onFlowSelect={handleFlowSelect}
                onClose={handleFlowDetailsClose}
              />
            </Box>
            {/* Flow Details Panel (side by side with Flows Table) */}
            {showFlowDetails && selectedFlow && (
              <FlowDetailsPanel
                flow={selectedFlow}
                onClose={handleFlowDetailsClose}
                flowFilters={flowFilters}
                filters={{ verdicts: new Set(verdictFilter === 'all' ? [] : [verdictFilter]) }}
                onFilterByPod={(pod, ns, direction) => filterFromDetails('pod', pod && ns && ns !== '-' ? `${ns}/${pod}` : pod, direction)}
                onFilterByVerdict={(verdict) => {
                  setVerdictFilter(verdict.toLowerCase() || 'all');
                }}
                onFilterByLabel={(label, direction) => filterFromDetails('label', label, direction)}
                onFilterByIP={(ip, direction) => filterFromDetails('ip', ip, direction)}
                onFilterByTCPFlag={(flag, direction) => filterFromDetails('tcp-flag', flag, direction)}
                onFilterByIdentity={(identity, direction) => filterFromDetails('identity', identity, direction)}
                onFilterByDNS={dns => filterFromDetails('dns', dns)}
              />
            )}
          </Box>
        </TopologyWorkspace>
      </Box>
    </Box>
  );
}

export default Topology;
