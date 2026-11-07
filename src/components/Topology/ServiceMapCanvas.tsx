import { HubbleIcon } from './HubbleIcon';
import { Box, CircularProgress, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapZoom } from '../../hooks/Topology/useMapZoom';
import { ServiceMapArrowBody } from '../ServiceMap/ArrowRenderer/ServiceMapArrowBody';
import { ServiceMapArrowDuckFeet } from '../ServiceMap/ArrowRenderer/ServiceMapArrowDuckFeet';
import { BBoxCollector } from '../ServiceMap/domain/bbox-collector';
import { XYWH, type XY } from '../ServiceMap/geometry';
import { useMutationObserver } from '../ServiceMap/Map/hooks/useMutationObserver';
import { CARD_HEIGHT, CARD_WIDTH, type ServiceMapEdge, type ServiceMapNode } from '../ServiceMap/service-map';
import { buildArrows, combineAccessPointArrows, extractAccessPoints } from '../ServiceMap/service-map/arrow-strategy';
import { preserveMapPositions, type PlacedCard } from '../ServiceMap/service-map/stable-layout';
import { computeHubbleLayout } from '../ServiceMap/service-map/layout';
import { ServiceMapCardAdapter } from '../ServiceMap/ServiceMapCard/ServiceMapCardAdapter';
import { NamespaceBoundary } from './NamespaceBoundary';
import { sizes } from '../ServiceMap/vars';

const NAMESPACE_PADDING = sizes.namespaceBackplatePadding;
interface ServiceMapCanvasProps {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  loading?: boolean;
  error?: string | null;
  selectedNodeId?: string | null;
  highlightedNodeIds?: Set<string>;
  onNodeClick?: (data: ServiceMapNode['data']) => void;
  onPaneClick?: () => void;
  isDark?: boolean;
  namespaceFilter?: string;
}

export function ServiceMapCanvas({ nodes, edges, loading = false, error = null,
  selectedNodeId, highlightedNodeIds, onNodeClick, onPaneClick, isDark: darkOverride,
  namespaceFilter = '',
}: ServiceMapCanvasProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = darkOverride ?? theme.palette.mode === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<SVGGElement>(null);
  const userMoved = useRef(false);
  const autoFitDone = useRef(false);
  const { ref: svgRef, transform, setTransform, zoom } = useMapZoom({
    minZoom: 0.02,
    onMapDrag: dragging => { if (dragging) userMoved.current = true; },
  });
  const collector = useMemo(() => new BBoxCollector(), []);
  const [dimensions, setDimensions] = useState<Map<string, XYWH>>(new Map());
  const [portOffsets, setPortOffsets] = useState<Map<string, { cardId: string; xy: XY }>>(new Map());

  useMutationObserver({ ref: cardsRef, options: { all: true } }, () => collector.refresh());
  useEffect(() => {
    collector.onCoordsUpdated(({ cards, accessPoints }) => {
      const next = new Map(cards.filter(c => c.bbox.w > 0 && c.bbox.h > 0).map(c => [c.id, c.bbox]));
      setDimensions(previous => previous.size === next.size && Array.from(next).every(([id, b]) => {
        const old = previous.get(id);
        return old && Math.abs(old.w - b.w) < 0.5 && Math.abs(old.h - b.h) < 0.5;
      }) ? previous : next);
      const ports = new Map(accessPoints.flatMap(ap => {
        const card = next.get(ap.cardId);
        return card && ap.bbox.w > 0 && ap.bbox.h > 0 ? [[ap.id, { cardId: ap.cardId, xy: { x: ap.bbox.center.x - card.x, y: ap.bbox.center.y - card.y } }] as const] : [];
      }));
      setPortOffsets(previous => previous.size === ports.size && Array.from(ports).every(([id, port]) => {
        const old = previous.get(id);
        return old?.cardId === port.cardId && Math.abs(old.xy.x - port.xy.x) < 0.5 && Math.abs(old.xy.y - port.xy.y) < 0.5;
      }) ? previous : ports);
    });
    return () => collector.clear();
  }, [collector]);

  const measured = nodes.length > 0 && nodes.every(node => dimensions.has(node.id));
  const [layout, setLayout] = useState(() => ({
    nodes, edges, scope: namespaceFilter, dimensions,
    positionedNodes: computeHubbleLayout(nodes, edges, namespaceFilter === 'all' ? '' : namespaceFilter, { dimensions }),
    committed: new Map<string, PlacedCard>(),
  }));
  // Adjust derived layout only when its inputs change. Keeping the committed
  // geometry in state also makes concurrent renders independent of refs.
  if (layout.nodes !== nodes || layout.edges !== edges || layout.scope !== namespaceFilter || layout.dimensions !== dimensions) {
    const proposed = computeHubbleLayout(nodes, edges, namespaceFilter === 'all' ? '' : namespaceFilter, { dimensions });
    const previous = layout.scope === namespaceFilter ? layout.committed : new Map<string, PlacedCard>();
    const positionedNodes = namespaceFilter === 'all' ? preserveMapPositions(proposed, previous, dimensions) : proposed;
    const committed = !nodes.length || measured ? new Map(positionedNodes.map(node => [node.id, {
      ...node.position, w: dimensions.get(node.id)?.w || CARD_WIDTH, h: dimensions.get(node.id)?.h || CARD_HEIGHT,
    }])) : previous;
    setLayout({ nodes, edges, scope: namespaceFilter, dimensions, positionedNodes, committed });
  }
  const positionedNodes = layout.positionedNodes;
  const boxes = useMemo(() => new Map(positionedNodes.map(n => [n.id,
    XYWH.fromArgs(n.position.x, n.position.y, dimensions.get(n.id)?.w || CARD_WIDTH, dimensions.get(n.id)?.h || CARD_HEIGHT),
  ])), [positionedNodes, dimensions]);
  const namespaceBoxes = useMemo(() => {
    if (!namespaceFilter || namespaceFilter === 'all') return [];
    const groups = new Map<string, XYWH[]>();
    positionedNodes.forEach(n => {
      if (n.data.isWorld || n.data.isHost || n.data.type === 'external' || n.data.labels?.some(l => l.key.includes('reserved:remote-node'))) return;
      const ns = n.data.namespace || 'default';
      if (namespaceFilter && namespaceFilter !== 'all' && ns !== namespaceFilter) return;
      groups.set(ns, [...(groups.get(ns) ?? []), boxes.get(n.id)!]);
    });
    return Array.from(groups, ([namespace, entries]) => {
      const x = Math.min(...entries.map(b => b.x)) - NAMESPACE_PADDING;
      const y = Math.min(...entries.map(b => b.y)) - NAMESPACE_PADDING;
      return { namespace, x, y,
        width: Math.max(...entries.map(b => b.x + b.w)) + NAMESPACE_PADDING - x,
        height: Math.max(...entries.map(b => b.y + b.h)) + NAMESPACE_PADDING - y };
    });
  }, [positionedNodes, boxes, namespaceFilter]);
  const portCoords = useMemo(() => new Map(Array.from(portOffsets).flatMap(([id, port]) => {
    const card = boxes.get(port.cardId);
    return card ? [[id, { x: card.x + port.xy.x, y: card.y + port.xy.y }] as const] : [];
  })), [portOffsets, boxes]);
  const arrows = useMemo(() => Array.from(buildArrows(boxes, extractAccessPoints(edges),
    positionedNodes.map(n => ({ id: n.id, data: n.data, bbox: boxes.get(n.id)! })), portCoords).values()), [boxes, edges, positionedNodes, portCoords]);
  const branches = useMemo(() => combineAccessPointArrows(arrows), [arrows]);
  const activeConnectors = new Set(arrows.filter(a => a.senderId === selectedNodeId || a.receiverId === selectedNodeId)
    .flatMap(a => Array.from(a.accessPointArrows.values(), ap => ap.connectorId)));


  const fitView = useCallback(() => {
    const container = containerRef.current;
    if (!container || !boxes.size || !container.clientWidth || !container.clientHeight) return;
    const entries = Array.from(boxes.values());
    const minX = Math.min(...entries.map(b => b.x)) - NAMESPACE_PADDING;
    const minY = Math.min(...entries.map(b => b.y)) - NAMESPACE_PADDING;
    const width = Math.max(...entries.map(b => b.x + b.w)) + NAMESPACE_PADDING - minX;
    const height = Math.max(...entries.map(b => b.y + b.h)) + NAMESPACE_PADDING - minY;
    // Read the overlay only when fitting, never resize the SVG while dragging
    // the panel. An explicit Fit still uses the currently unobscured area.
    const panel = container.parentElement?.querySelector('[data-topology-panel]');
    const visibleHeight = Math.max(1, container.clientHeight - (panel?.getBoundingClientRect().height ?? 0));
    const scale = Math.max(0.02, Math.min((container.clientWidth - 48) / width, (visibleHeight - 48) / height, 1));
    setTransform(`translate(${(container.clientWidth - width * scale) / 2 - minX * scale}, ${(visibleHeight - height * scale) / 2 - minY * scale}) scale(${scale})`);
  }, [boxes, setTransform]);
  useLayoutEffect(() => {
    userMoved.current = false;
    autoFitDone.current = false;
  }, [namespaceFilter]);
  useEffect(() => {
    if (!nodes.length) autoFitDone.current = false;
    if (measured && !autoFitDone.current && !userMoved.current) {
      fitView();
      autoFitDone.current = true;
    }
  }, [fitView, measured, nodes.length, loading]);
  const latestFitView = useRef(fitView);
  useLayoutEffect(() => { latestFitView.current = fitView; }, [fitView]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    let width = container.clientWidth, height = container.clientHeight;
    const observer = new ResizeObserver(() => {
      const changed = width !== container.clientWidth || height !== container.clientHeight;
      width = container.clientWidth;
      height = container.clientHeight;
      if (changed && autoFitDone.current && !userMoved.current) latestFitView.current();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const changeZoom = (factor: number) => {
    userMoved.current = true;
    const cx = (containerRef.current?.clientWidth ?? 0) / 2;
    const cy = (containerRef.current?.clientHeight ?? 0) / 2;
    const scale = Math.max(0.02, Math.min(4, zoom.scale * factor));
    const ratio = scale / zoom.scale;
    setTransform(`translate(${cx - (cx - zoom.x) * ratio}, ${cy - (cy - zoom.y) * ratio}) scale(${scale})`);
  };
  const status = error || (!nodes.length ? 'No data found to render a service map' : null);
  return (
    <Box ref={containerRef} data-testid="service-map-canvas" sx={{ position: 'absolute', inset: 0, mx: 1,
      borderRadius: '10px', overflow: 'hidden', bgcolor: isDark ? '#171d26' : '#e5ebef', border: '1px solid', borderColor: 'divider' }}
      onClick={event => {
        if (!(event.target instanceof Element) || !event.target.closest('.service-map-card, button')) onPaneClick?.();
      }}>
      <svg ref={svgRef} aria-label={t('topology.title')} onWheelCapture={() => { userMoved.current = true; }} onTouchMoveCapture={() => { userMoved.current = true; }} style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'none' }}>
        <g transform={transform}>
          {namespaceBoxes.map(box => <NamespaceBoundary key={box.namespace} {...box} />)}
          <g className="arrows" style={{ pointerEvents: 'none' }}>
            {arrows.map(arrow => <g key={arrow.id} opacity={selectedNodeId && arrow.senderId !== selectedNodeId && arrow.receiverId !== selectedNodeId ? 0.15 : 1}>
              <ServiceMapArrowBody arrow={arrow} />
            </g>)}
          </g>
          <g ref={cardsRef} className="visible-cards">
            {positionedNodes.map(node => <ServiceMapCardAdapter key={node.id} data={node.data}
              x={node.position.x} y={node.position.y} height={boxes.get(node.id)?.h}
              currentNamespace={namespaceFilter === 'all' ? undefined : namespaceFilter}
              active={selectedNodeId === node.id}
              dimmed={!!selectedNodeId && selectedNodeId !== node.id && !highlightedNodeIds?.has(node.id)}
              onClick={() => onNodeClick?.(node.data)}
              cardRef={el => { if (el) collector.registerCard(node.id, el); else collector.removeCard(node.id); }}
              accessPointRef={(id, el) => { if (el) collector.registerAccessPoint(id, node.id, el); else collector.removeAccessPoint(id); }} />)}
          </g>
          <g className="access-point-arrows" style={{ pointerEvents: 'none' }}>
            {Array.from(branches, ([id, aps]) => <g key={id} opacity={selectedNodeId && !activeConnectors.has(id) ? 0.15 : 1}>
              <ServiceMapArrowDuckFeet connectorId={id} arrows={aps} />
            </g>)}
          </g>
        </g>
      </svg>
      {status && <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {!error && <CircularProgress size={68} sx={{ color: '#0f9960' }} />}
        {status && <Typography sx={{ mt: '20px', fontSize: 14, fontWeight: 500, color: error ? 'error.main' : '#5c7080' }}>{status}</Typography>}
      </Box>}
      {!!nodes.length && <Box sx={{ position: 'absolute', bottom: 'calc(min(var(--topology-panel-height, 0px), 75%) + 16px)', right: 16, display: 'flex', alignItems: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Tooltip title={t('topology.zoomOut')}><IconButton size="small" aria-label={t('topology.zoomOut')} onClick={() => changeZoom(1 / 1.25)}><HubbleIcon name="zoom-out" fontSize="small" /></IconButton></Tooltip>
        <Typography variant="caption" sx={{ px: 1, minWidth: 48, textAlign: 'center' }}>{Math.round(zoom.scale * 100)}%</Typography>
        <Tooltip title={t('topology.zoomIn')}><IconButton size="small" aria-label={t('topology.zoomIn')} onClick={() => changeZoom(1.25)}><HubbleIcon name="zoom-in" fontSize="small" /></IconButton></Tooltip>
        <Tooltip title={t('topology.fitView')}><IconButton size="small" aria-label={t('topology.fitView')} onClick={() => { userMoved.current = false; autoFitDone.current = true; fitView(); }}><HubbleIcon name="zoom-to-fit" fontSize="small" /></IconButton></Tooltip>
      </Box>}
    </Box>
  );
}
