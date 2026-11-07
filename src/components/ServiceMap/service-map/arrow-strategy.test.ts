import { accessPointId } from './connection-ids';
import { expect, it } from 'vitest';
import { XYWH, Vec2 } from '../geometry';
import { buildArrows, combineAccessPointArrows, ConnectorCoordsAccumulator, extractAccessPoints } from './arrow-strategy';
import type { NodeBBox } from './arrow-types';

const nodes: NodeBBox[] = [
  { id: 'client', data: { id: 'client', label: 'client', namespace: 'demo', type: 'service' }, bbox: XYWH.fromArgs(0, 100, 260, 180) },
  { id: 'server', data: { id: 'server', label: 'server', namespace: 'demo', type: 'service' }, bbox: XYWH.fromArgs(900, 500, 260, 180) },
];
it('does not add the receiver offset twice when positioning a connector', () => {
  const boxes = new Map(nodes.map(node => [node.id, node.bbox]));
  const connections = extractAccessPoints([{ source: 'client', target: 'server', verdict: 'forwarded' }]);
  const positions = new Map([['server', Vec2.fromXY({ x: 1030, y: 608 })]]);
  const accumulator = new ConnectorCoordsAccumulator(connections, positions, boxes);
  const connector = accumulator.accumulate('client', 'server');
  expect(connector?.connectorCoords).toEqual({ x: 780, y: 608 });
});
it('merges repeated access points and carries denied and forwarded verdicts into rendered connector lines', () => {
  const connections = extractAccessPoints([
    { source: 'client', target: 'server', verdict: 'forwarded' },
    { source: 'client', target: 'server', verdict: 'denied' },
  ]);
  const arrows = buildArrows(new Map(nodes.map(node => [node.id, node.bbox])), connections, nodes);
  expect(arrows.size).toBe(1);
  const arrow = [...arrows.values()][0];
  expect(arrow.accessPointArrows.size).toBe(1);
  const connector = [...arrow.accessPointArrows.values()][0];
  expect(connector.verdicts).toEqual(new Set(['FORWARDED', 'DENIED']));
  expect(connector.hasAbnormalVerdict).toBe(true);
  expect(connector.start).toEqual(arrow.end);
  expect(connector.end).toEqual({ x: 900, y: 550 });
  expect(buildArrows(new Map(), connections, nodes).size).toBe(0);
});

it('shares one receiver connector and one port branch across multiple senders', () => {
  const clients = [
    { id: 'a', data: { id: 'a', label: 'a', namespace: 'demo', type: 'service' as const }, bbox: XYWH.fromArgs(0, 0, 560, 200) },
    { id: 'b', data: { id: 'b', label: 'b', namespace: 'demo', type: 'service' as const }, bbox: XYWH.fromArgs(0, 400, 560, 200) },
    { id: 'api', data: { id: 'api', label: 'api', namespace: 'demo', type: 'service' as const, ports: [8080] }, bbox: XYWH.fromArgs(900, 200, 560, 200) },
  ];
  const edges = [
    { source: 'a', target: 'api', destinationPort: 8080, protocol: 'TCP', verdict: 'forwarded' },
    { source: 'b', target: 'api', destinationPort: 8080, protocol: 'TCP', verdict: 'dropped' },
  ];
  const arrows = buildArrows(new Map(clients.map(n => [n.id, n.bbox])), extractAccessPoints(edges), clients);
  const branches = combineAccessPointArrows(arrows.values());
  expect(arrows.size).toBe(2);
  expect(branches.size).toBe(1);
  expect([...branches.values()][0].size).toBe(1);
  const branch = [...[...branches.values()][0].values()][0];
  expect(branch.verdicts).toEqual(new Set(['FORWARDED', 'DROPPED']));
  const bodies = [...arrows.values()];
  expect(bodies[0].end).toBe(bodies[1].end);
  expect(branch.start).toBe(bodies[0].end);
  expect(branch.end!.y).toBeGreaterThan(clients[2].bbox.y + 115);
  const reordered = buildArrows(new Map(clients.map(n => [n.id, n.bbox])), extractAccessPoints([...edges].reverse()), clients);
  bodies.forEach(a => expect(reordered.get(a.id)!.points).toEqual(a.points));
});

it('uses measured TCP/UDP port centers and separates distinct receiver port groups', () => {
  const endpoints: NodeBBox[] = [
    ...nodes,
    { id: 'udp-client', data: { id: 'udp-client', label: 'udp-client', namespace: 'demo', type: 'service' }, bbox: XYWH.fromArgs(0, 400, 260, 180) },
  ];
  endpoints[1] = { ...endpoints[1], data: { ...endpoints[1].data, accessPoints: [
    { port: 53, protocol: 'TCP' }, { port: 53, protocol: 'UDP' },
  ] } };
  const measured = new Map([
    [accessPointId('server', 53, 'TCP'), { x: 935, y: 640 }],
    [accessPointId('server', 53, 'UDP'), { x: 935, y: 680 }],
  ]);
  const connections = extractAccessPoints([
    { source: 'client', target: 'server', destinationPort: 53, protocol: 'TCP' },
    { source: 'udp-client', target: 'server', destinationPort: 53, protocol: 'UDP' },
  ]);
  const arrows = [...buildArrows(new Map(endpoints.map(n => [n.id, n.bbox])), connections, endpoints, measured).values()];
  expect(arrows).toHaveLength(2);
  expect(Math.abs(arrows[0].end!.y - arrows[1].end!.y)).toBe(50);
  arrows.forEach(a => {
    const branch = [...a.accessPointArrows.values()][0];
    expect(branch.end).toEqual(measured.get(branch.accessPointId!));
    expect(branch.start).toBe(a.end);
  });
  expect(combineAccessPointArrows(arrows).size).toBe(2);
});

it('does not invent port 80 for topology-only connections', () => {
  const connections = extractAccessPoints([{ source: 'client', target: 'server' }]);
  const ap = connections.get('client')!.get('server')![0];
  expect(ap.port).toBe(0);
  expect(ap.id).toBe(accessPointId('server'));
});
