import { expect, it } from 'vitest';
import type { HubbleFlow } from '../../types/hubble';
import { FlowGraphHistory } from './graphHistory';
import { buildHubbleGraph } from './graphData';
const observation = (pod: string, destination = 'api', port = 8080): HubbleFlow => ({
  source: { id: 1, namespace: 'demo', podName: pod, identity: pod === 'a' ? 100 : 101, labels: [], workloads: [] },
  destination: { id: 2, namespace: 'demo', podName: destination, identity: 200, labels: [], workloads: [] },
  l4: { tcp: { sourcePort: 42000, destinationPort: port } }, verdict: 'FORWARDED', reply: false,
  dropReason: 0, type: 'L3_L4', nodeName: 'node', sourceNamesList: [], destinationNamesList: [], summary: '', trafficDirection: 'EGRESS', authType: '',
});
it('keeps observed connections after packets leave the recent table window', () => {
  const history = new FlowGraphHistory();
  history.ingest([observation('a')]);
  history.ingest(Array.from({ length: 600 }, () => observation('b')));
  const graph = buildHubbleGraph([], history.snapshot());
  expect(graph.nodes).toHaveLength(3);
  expect(graph.edges).toHaveLength(2);
});
it('does not invalidate map data for packet timestamps, flags or ephemeral source ports', () => {
  const history = new FlowGraphHistory();
  expect(history.ingest([observation('a')])).toBe(true);
  const packet = observation('a');
  packet.time = { seconds: 1000, nanos: 1 };
  packet.l4!.tcp!.sourcePort = 51000;
  expect(history.ingest([packet])).toBe(false);
  expect(history.snapshot()).toHaveLength(1);
});
it('retains distinct request ports and verdict/status filters, excluding replies and traces', () => {
  const history = new FlowGraphHistory();
  const reply = { ...observation('a'), reply: true };
  const trace = { ...observation('a'), verdict: 'TRACED' };
  history.ingest([reply, trace]);
  expect(history.snapshot()).toEqual([]);
  history.ingest([observation('a'), observation('a', 'api', 9090), { ...observation('a'), verdict: 'DROPPED' }]);
  expect(history.snapshot()).toHaveLength(3);
  history.clear();
  expect(buildHubbleGraph([], history.snapshot())).toEqual({ nodes: [], edges: [] });
});
