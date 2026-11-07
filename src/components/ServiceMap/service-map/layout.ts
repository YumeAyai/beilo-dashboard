import { CARD_HEIGHT, CARD_WIDTH } from './types';
import { sizes } from '../vars';
import type { ServiceCardData } from './types';

interface LayoutNode {
  id: string;
  data: ServiceCardData;
  edges: Array<{ target: string; source: string }>;
}

export interface PositionedNode {
  id: string;
  data: ServiceCardData;
  position: { x: number; y: number };
}

type PlacementKind = 'FromWorld' | 'ToWorld' | 'AnotherNamespace' | 'InsideWithConnections' | 'InsideWithoutConnections' | 'OutsideManaged';

interface PlacementMeta {
  kind: PlacementKind;
  node: LayoutNode;
  weight: number;
}

interface PlacementEntry {
  kind: PlacementKind;
  node: LayoutNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

const VPADDING = sizes.endpointVPadding;
const HPADDING = sizes.endpointHPadding;
const NAMESPACE_PADDING = sizes.namespaceBackplatePadding;
type CardDimensions = ReadonlyMap<string, { w: number; h: number }>;

function findSpecialInteractions(
  nodeId: string,
  nodes: LayoutNode[],
  nodeById: Map<string, LayoutNode>,
): { hasWorldAsSender: boolean; hasHostAsSender: boolean; hasWorldAsReceiver: boolean } {
  const senders = nodes.filter(n => n.edges.some(e => e.target === nodeId));
  const receivers = (nodeById.get(nodeId)?.edges ?? []).map(e => nodeById.get(e.target));
  return {
    hasWorldAsSender: senders.some(n => n.data.isWorld),
    hasHostAsSender: senders.some(n => n.data.isHost),
    hasWorldAsReceiver: receivers.some(n => n?.data.isWorld),
  };
}

function getPlacementMeta(
  node: LayoutNode,
  currentNamespace: string,
  nodes: LayoutNode[],
  nodeById: Map<string, LayoutNode>,
): PlacementMeta {
  const incomingsCount = nodes.filter((n) => n.edges.some((e) => e.target === node.id)).length;
  const outgoingsCount = node.edges.length;
  const props = findSpecialInteractions(node.id, nodes, nodeById);

  let kind: PlacementKind = 'InsideWithoutConnections';
  if (node.data.isHost || node.data.labels?.some(l => l.key.includes('reserved:remote-node'))) {
    kind = 'FromWorld';
  } else if (node.data.isWorld) {
    kind = incomingsCount > 0 ? 'ToWorld' : 'FromWorld';
  } else if (currentNamespace && node.data.namespace !== currentNamespace) {
    kind = 'AnotherNamespace';
  } else if (!currentNamespace || incomingsCount > 0 || outgoingsCount > 0) {
    kind = 'InsideWithConnections';
  }

  let weight = -incomingsCount + outgoingsCount;
  weight += props.hasWorldAsSender || props.hasHostAsSender ? 1000 : 0;
  weight += props.hasWorldAsReceiver ? 500 : 0;

  return { kind, node, weight };
}

function buildPlacementColumns(metas: PlacementMeta[]): { columns: PlacementMeta[][]; nsBoundaries: number[] } {
  const sorted = [...metas].sort((a, b) => b.weight - a.weight);
  return { columns: distributeToColumns(sorted, Math.ceil(Math.sqrt(metas.length))), nsBoundaries: [] };
}

function distributeToColumns(sorted: PlacementMeta[], maxCardsInColumn: number): PlacementMeta[][] {
  const columns: PlacementMeta[][] = [];
  let curColumn: PlacementMeta[] = [];
  let curWeight: number | null = null;

  const flushColumn = () => {
    columns.push(curColumn);
    curColumn = [];
  };

  for (let i = 0; i < sorted.length; i++) {
    const plc = sorted[i];
    const maxCardsReached = curColumn.length >= maxCardsInColumn;
    const weightChanged = curWeight != null && plc.weight !== curWeight;

    if (maxCardsReached || weightChanged) flushColumn();

    curWeight = plc.weight;
    curColumn.push(plc);

    if (i === sorted.length - 1) flushColumn();
  }

  return columns;
}

function alignColumns(
  cardsColumns: Map<PlacementKind, { columns: PlacementMeta[][]; nsBoundaries: number[] }>,
  kinds: PlacementKind[],
  dimensions?: CardDimensions,
): Map<PlacementKind, { entries: PlacementEntry[]; bbox: { x: number; y: number; w: number; h: number } }> {
  const alignment = new Map();
  const columnHeights = new Map<PlacementEntry[], number>();
  const offset = { x: 0, y: 0 };
  let entireHeight = 0;

  for (const kind of kinds) {
    const colData = cardsColumns.get(kind);
    if (!colData) continue;
    const columns = colData.columns;

    const entries: PlacementEntry[] = [];
    const bbox = { x: offset.x, y: offset.y, w: 0, h: 0 };
    const nsBoundaries = new Set(colData.nsBoundaries);

    columns.forEach((column, ci) => {
      const columnEntries: PlacementEntry[] = [];
      let columnWidth = 0;
      let columnHeight = 0;
      offset.y = 0;

      column.forEach((meta, ri) => {
        const measured = dimensions?.get(meta.node.id);
        const geometry = {
          x: offset.x,
          y: offset.y,
          w: measured?.w || CARD_WIDTH,
          h: measured?.h || CARD_HEIGHT,
        };

        const entry: PlacementEntry = {
          kind: meta.kind,
          node: meta.node,
          ...geometry,
        };

        entries.push(entry);
        columnEntries.push(entry);

        columnWidth = Math.max(columnWidth, geometry.w);
        columnHeight += geometry.h + (ri === 0 ? 0 : VPADDING);
        offset.y += geometry.h + VPADDING;
      });

      columnHeights.set(columnEntries, columnHeight);
      const nsGap = nsBoundaries.has(ci) && ci < columns.length - 1 ? NAMESPACE_PADDING * 2 : 0;
      offset.x += columnWidth + HPADDING + nsGap;
      bbox.w += columnWidth + (ci === 0 ? 0 : HPADDING) + nsGap;
      bbox.h = Math.max(bbox.h, offset.y - VPADDING);
      entireHeight = Math.max(entireHeight, bbox.h);
    });

    alignment.set(kind, { entries, bbox });
  }

  columnHeights.forEach((columnHeight, entries) => {
    if (entries.length === 0) return;
    const verticalOffset = (entireHeight - columnHeight) / 2;
    for (const entry of entries) {
      entry.y += verticalOffset;
    }
  });

  return alignment;
}

export function computeHubbleLayout(
  nodes: Array<{ id: string; data: ServiceCardData }>,
  edges: Array<{ source: string; target: string }>,
  currentNamespace: string,
  options?: { showCrossNamespace?: boolean; dimensions?: CardDimensions },
): PositionedNode[] {
  const showCrossNamespace = options?.showCrossNamespace ?? true;

  if (nodes.length === 0) return [];

  const nodeByIds = new Set(nodes.map(n => n.id));
  const nodeById = new Map<string, LayoutNode>();
  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    const ln: LayoutNode = {
      id: n.id,
      data: n.data,
      edges: Array.from(new Map(edges.filter(e => e.source === n.id && nodeByIds.has(e.target) && e.target !== n.id).map(e => [e.target, e])).values()),
    };
    nodeById.set(n.id, ln);
    return ln;
  });

  const groups = new Map<PlacementKind, Set<PlacementMeta>>();
  for (const node of layoutNodes) {
    const meta = getPlacementMeta(node, currentNamespace, layoutNodes, nodeById);
    if (!showCrossNamespace && meta.kind === 'AnotherNamespace') continue;
    const kindSet = groups.get(meta.kind) ?? new Set();
    kindSet.add(meta);
    groups.set(meta.kind, kindSet);
  }

  const columns = new Map<PlacementKind, { columns: PlacementMeta[][]; nsBoundaries: number[] }>();
  for (const [kind, metas] of groups) {
    columns.set(kind, buildPlacementColumns([...metas]));
  }

  const top = alignColumns(columns, ['ToWorld'], options?.dimensions);
  const middle = alignColumns(columns, ['FromWorld', 'InsideWithConnections', 'InsideWithoutConnections', 'OutsideManaged'], options?.dimensions);
  const bottom = alignColumns(columns, ['AnotherNamespace'], options?.dimensions);

  const toOutside = top.get('ToWorld');
  const fromOutside = middle.get('FromWorld');
  const insideWithConns = middle.get('InsideWithConnections');
  const insideNoConns = middle.get('InsideWithoutConnections');
  const outsideManaged = middle.get('OutsideManaged');
  const anotherNs = bottom.get('AnotherNamespace');

  const shiftEntries = (dx: number, dy: number, entries: PlacementEntry[]) => {
    for (const entry of entries) {
      entry.x += dx;
      entry.y += dy;
    }
  };

  if (insideWithConns && toOutside) {
    const relativeOffset = insideWithConns.bbox.x - toOutside.bbox.x;
    const bboxDiff = (insideWithConns.bbox.w - toOutside.bbox.w) / 2;
    shiftEntries(relativeOffset + bboxDiff, 0, toOutside.entries);
  }

  if (toOutside) {
    const middleShiftY = toOutside.bbox.h + 2 * NAMESPACE_PADDING;
    if (fromOutside) shiftEntries(0, middleShiftY, fromOutside.entries);
    if (insideWithConns) shiftEntries(0, middleShiftY, insideWithConns.entries);
    if (insideNoConns) shiftEntries(0, middleShiftY, insideNoConns.entries);
    if (outsideManaged) shiftEntries(0, middleShiftY, outsideManaged.entries);
  }

  if (anotherNs) {
    let bottomShiftY = 0;
    if (toOutside) bottomShiftY += toOutside.bbox.h + 2 * NAMESPACE_PADDING;

    let middleHeight = 0;
    if (fromOutside) middleHeight = Math.max(middleHeight, fromOutside.bbox.h);
    if (insideWithConns) middleHeight = Math.max(middleHeight, insideWithConns.bbox.h);
    if (insideNoConns) middleHeight = Math.max(middleHeight, insideNoConns.bbox.h);
    if (outsideManaged) middleHeight = Math.max(middleHeight, outsideManaged.bbox.h);

    if (middleHeight > 0) bottomShiftY += middleHeight + 2 * NAMESPACE_PADDING;

    if (insideWithConns) {
      const relativeOffset = insideWithConns.bbox.x - anotherNs.bbox.x;
      const bboxDiff = (insideWithConns.bbox.w - anotherNs.bbox.w) / 2;
      shiftEntries(relativeOffset + bboxDiff, bottomShiftY, anotherNs.entries);
    } else {
      shiftEntries(0, bottomShiftY, anotherNs.entries);
    }
  }

  const positioned: PositionedNode[] = [];
  const collect = (entries?: PlacementEntry[]) => {
    if (!entries) return;
    for (const e of entries) {
      positioned.push({
        id: e.node.id,
        data: e.node.data,
        position: { x: e.x, y: e.y },
      });
    }
  };

  collect(toOutside?.entries);
  collect(fromOutside?.entries);
  collect(insideWithConns?.entries);
  collect(insideNoConns?.entries);
  collect(outsideManaged?.entries);
  collect(anotherNs?.entries);

  return positioned;
}
