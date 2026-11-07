import { describe, expect, it } from 'vitest';
import { computeHubbleLayout } from './layout';
import { CARD_HEIGHT, CARD_WIDTH, type ServiceCardData } from './types';

const node = (id: string, data: Partial<ServiceCardData> = {}) => ({
  id, data: { id, label: id, namespace: 'demo', type: 'service' as const, ...data },
});
const positions = (nodes: ReturnType<typeof computeHubbleLayout>) => new Map(nodes.map(n => [n.id, n.position]));

describe('Hubble service map placement', () => {
  it('places incoming world on the left, outgoing world above and cross-namespace peers below', () => {
    const nodes = [node('client', { isWorld: true }), node('frontend'), node('api'),
      node('internet', { isWorld: true }), node('dns', { namespace: 'kube-system' })];
    const edges = [{ source: 'client', target: 'frontend' }, { source: 'frontend', target: 'api' },
      { source: 'api', target: 'internet' }, { source: 'api', target: 'dns' }];
    const p = positions(computeHubbleLayout(nodes, edges, 'demo'));
    expect(p.get('client')!.x).toBeLessThan(p.get('frontend')!.x);
    expect(p.get('internet')!.y).toBeLessThan(p.get('api')!.y);
    expect(p.get('dns')!.y).toBeGreaterThan(p.get('api')!.y + CARD_HEIGHT);
  });

  it('gives a service sending to world the same special-interaction priority as Hubble', () => {
    const nodes = [node('ordinary'), node('egress'), node('internet', { isWorld: true })];
    const p = positions(computeHubbleLayout(nodes, [
      { source: 'ordinary', target: 'egress' }, { source: 'egress', target: 'internet' },
    ], 'demo'));
    expect(p.get('egress')!.x).toBeLessThan(p.get('ordinary')!.x);
  });

  it('does not move cards when repeated flow observations describe the same peers', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [{ source: 'a', target: 'c' }, { source: 'b', target: 'c' }];
    expect(computeHubbleLayout(nodes, [...edges, edges[0], edges[0]], 'demo'))
      .toEqual(computeHubbleLayout(nodes, edges, 'demo'));
  });

  it('uses measured expanded card heights without overlapping cards in a column', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const dimensions = new Map([['a', { w: CARD_WIDTH, h: 620 }]]);
    const p = positions(computeHubbleLayout(nodes, [], 'demo', { dimensions }));
    expect(p.get('a')!.x).toBe(p.get('b')!.x);
    expect(p.get('b')!.y).toBeGreaterThanOrEqual(p.get('a')!.y + 620 + 200);
  });

  it('orders cross-namespace peers by connection weight without inserting namespace gaps', () => {
    const nodes = [node('a', { namespace: 'one' }), node('b', { namespace: 'two' })];
    const p = positions(computeHubbleLayout(nodes, [{ source: 'a', target: 'b' }], 'demo'));
    expect(p.get('a')!.x).toBe(0);
    expect(p.get('b')!.x).toBe(CARD_WIDTH + 200);
  });
});
