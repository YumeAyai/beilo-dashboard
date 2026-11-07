import { Vec2, type XY, type XYWH } from '../geometry';
import { createCardOffsetAdvancers, ServiceMapArrow, SIZES, type AccessPointArrow } from './arrow-core';
import { accessPointId, cardConnectorId } from './connection-ids';
import type { ConnectionInfo, NodeBBox } from './arrow-types';

type Connections = Map<string, Map<string, ConnectionInfo['accessPoints']>>;
export interface CardConnectorCoords { connectorId: string; connectorCoords: XY }

export class ConnectorCoordsAccumulator {
  private cardConnectorIds = new Map<string, Set<string>>();
  private cardConnectorCoords = new Map<string, XY>();
  private connections: Connections;
  private midPoints: Map<string, Vec2>;
  private boxes: Map<string, XYWH>;
  constructor(connections: Connections, midPoints: Map<string, Vec2>, boxes: Map<string, XYWH>) {
    this.connections = connections;
    this.midPoints = midPoints;
    this.boxes = boxes;
  }

  accumulate(senderId: string, receiverId: string): CardConnectorCoords | null {
    const receiver = this.boxes.get(receiverId);
    const aps = this.connections.get(senderId)?.get(receiverId);
    const midpoint = this.midPoints.get(receiverId);
    if (!this.boxes.has(senderId) || !receiver || !aps?.length || !midpoint) return null;
    const connectorId = cardConnectorId(receiverId, aps.map(ap => ap.id));
    const existing = this.cardConnectorCoords.get(connectorId);
    if (existing) return { connectorId, connectorCoords: existing };
    const ids = this.cardConnectorIds.get(receiverId) ?? new Set<string>();
    const connectorCoords = { x: receiver.x - SIZES.connectorCardEndGap, y: midpoint.y + ids.size * SIZES.distanceBetweenConnectors };
    ids.add(connectorId);
    this.cardConnectorIds.set(receiverId, ids);
    this.cardConnectorCoords.set(connectorId, connectorCoords);
    return { connectorId, connectorCoords };
  }

  adjustVertically(): void {
    this.cardConnectorIds.forEach(ids => {
      const shift = (ids.size - 1) * SIZES.distanceBetweenConnectors / 2;
      ids.forEach(id => { this.cardConnectorCoords.get(id)!.y -= shift; });
    });
  }

  getConnectorCoords(senderId: string, receiverId: string): XY | null {
    const aps = this.connections.get(senderId)?.get(receiverId);
    return aps ? this.cardConnectorCoords.get(cardConnectorId(receiverId, aps.map(ap => ap.id))) ?? null : null;
  }
}

// Coordinates are measured at the port icons in SVG model space. Until the
// first measurement, use the matching port row rather than the card headline.
export function accessPointCoords(nodes: NodeBBox[], measured: ReadonlyMap<string, XY> = new Map()): Map<string, XY> {
  const result = new Map<string, XY>();
  nodes.forEach(({ id, data, bbox }) => {
    const points = data.accessPoints?.length ? data.accessPoints : (data.ports ?? []).map(port => ({ port, protocol: 'TCP' }));
    const coords = points.map((ap, index) => {
      const apId = accessPointId(id, ap.port, ap.protocol);
      const xy = measured.get(apId) ?? { x: bbox.x + 45, y: bbox.y + 146 + index * 28 };
      result.set(apId, xy);
      return xy;
    });
    result.set(accessPointId(id), coords.length ? {
      x: Math.min(...coords.map(p => p.x)), y: coords.reduce((sum, p) => sum + p.y, 0) / coords.length,
    } : { x: bbox.x, y: bbox.y + SIZES.arrowStartTopOffset });
  });
  return result;
}

export function buildArrows(
  nodeBBoxes: Map<string, XYWH>, connections: Connections, nodes: NodeBBox[],
  measured: ReadonlyMap<string, XY> = new Map(),
): Map<string, ServiceMapArrow> {
  const arrows = new Map<string, ServiceMapArrow>();
  const coords = accessPointCoords(nodes, measured);
  const midPoints = new Map<string, Vec2>();
  nodes.forEach(node => {
    const ids = new Set<string>();
    connections.forEach(receivers => receivers.get(node.id)?.forEach(ap => ids.add(ap.id)));
    const points = Array.from(ids, id => coords.get(id) ?? coords.get(accessPointId(node.id))!).filter(Boolean);
    if (points.length) midPoints.set(node.id, Vec2.fromXY({ x: 0, y: points.reduce((sum, p) => sum + p.y, 0) / points.length }));
  });
  const accumulator = new ConnectorCoordsAccumulator(connections, midPoints, nodeBBoxes);
  // Stable ordering prevents changing flow order from swapping connector lanes.
  const senders = Array.from(connections.keys()).sort((a, b) => {
    const aa = nodeBBoxes.get(a), bb = nodeBBoxes.get(b);
    return (aa?.y ?? 0) - (bb?.y ?? 0) || (aa?.x ?? 0) - (bb?.x ?? 0) || a.localeCompare(b);
  });
  senders.forEach(senderId => {
    const sender = nodeBBoxes.get(senderId);
    if (!sender) return;
    Array.from(connections.get(senderId)!.keys()).sort().forEach(receiverId => {
      const receiver = nodeBBoxes.get(receiverId);
      const connector = accumulator.accumulate(senderId, receiverId);
      if (!receiver || !connector) return;
      const arrow = new ServiceMapArrow().from(senderId, sender).to(receiverId, receiver)
        .addPoint({ x: sender.x + sender.w, y: sender.y + SIZES.arrowStartTopOffset })
        .addPoint(connector.connectorCoords);
      arrows.set(arrow.id, arrow);
      connections.get(senderId)!.get(receiverId)!.forEach(ap => {
        const xy = coords.get(ap.id) ?? coords.get(accessPointId(receiverId));
        if (!xy) return;
        arrow.addAccessPointArrow(connector.connectorId, ap.id).addVerdicts(ap.verdicts)
          .setPoints([connector.connectorCoords, xy]);
      });
    });
  });
  // All bodies and branch lines retain the same connector reference, as Hubble
  // does, so centering connectors moves their endpoints together.
  accumulator.adjustVertically();
  const offsets = createCardOffsetAdvancers();
  arrows.forEach(arrow => {
    arrow.buildPointsAroundSenderAndReceiver(offsets);
    arrow.computeFlowsInfoIndicatorPosition();
  });
  return arrows;
}

// A shared connector/port branch is drawn once; merge verdicts before drawing
// so a forwarded branch cannot hide a dropped branch behind it.
export function combineAccessPointArrows(arrows: Iterable<ServiceMapArrow>): Map<string, Map<string, AccessPointArrow>> {
  const combined = new Map<string, Map<string, AccessPointArrow>>();
  for (const arrow of arrows) arrow.accessPointArrows.forEach(ap => {
    if (!ap.connectorId) return;
    const group = combined.get(ap.connectorId) ?? new Map<string, AccessPointArrow>();
    const existing = group.get(ap.id);
    if (existing) existing.addVerdicts(ap.verdicts);
    else group.set(ap.id, ap);
    combined.set(ap.connectorId, group);
  });
  return combined;
}

export function extractAccessPoints(edges: Array<{ source: string; target: string; verdict?: string; destinationPort?: number; protocol?: string }>): Connections {
  const connections: Connections = new Map();
  edges.forEach(edge => {
    const receivers = connections.get(edge.source) ?? new Map();
    const aps: ConnectionInfo['accessPoints'] = receivers.get(edge.target) ?? [];
    const id = accessPointId(edge.target, edge.destinationPort, edge.protocol);
    const ap = aps.find(ap => ap.id === id);
    const verdicts = new Set(edge.verdict ? [edge.verdict.toUpperCase()] : []);
    if (ap) verdicts.forEach(v => ap.verdicts.add(v));
    else aps.push({ port: edge.destinationPort ?? 0, protocol: edge.protocol ?? '', id, verdicts });
    receivers.set(edge.target, aps);
    connections.set(edge.source, receivers);
  });
  return connections;
}
