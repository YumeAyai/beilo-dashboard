import { expect, it } from 'vitest';
import { preserveMapPositions, type PlacedCard } from './stable-layout';
import type { PositionedNode } from './layout';
const node = (id: string, x: number, y: number): PositionedNode => ({ id, data: { id, label: id, namespace: 'demo', type: 'service' }, position: { x, y } });
const previous = new Map<string, PlacedCard>([['a', { x: 0, y: 0, w: 560, h: 120 }], ['b', { x: 760, y: 0, w: 560, h: 120 }]]);
const sizes = new Map([['a', { w: 560, h: 120 }], ['b', { w: 560, h: 120 }], ['c', { w: 560, h: 120 }]]);
it('preserves existing coordinates when connection weights swap the proposed columns', () => {
  const result = preserveMapPositions([node('b', 0, 0), node('a', 760, 0)], previous, sizes);
  expect(result.find(n => n.id === 'a')!.position).toEqual({ x: 0, y: 0 });
  expect(result.find(n => n.id === 'b')!.position).toEqual({ x: 760, y: 0 });
});
it('adds a node without moving existing cards or overlapping their spacing', () => {
  const result = preserveMapPositions([node('a', 760, 0), node('b', 1520, 0), node('c', 0, 0)], previous, sizes);
  expect(result[0].position).toEqual({ x: 0, y: 0 });
  expect(result[1].position).toEqual({ x: 760, y: 0 });
  expect(result[2].position).toEqual({ x: 0, y: 320 });
});
it('only pushes a card below an expanded card while preserving other columns', () => {
  const old = new Map(previous).set('c', { x: 0, y: 320, w: 560, h: 120 });
  const expanded = new Map(sizes).set('a', { w: 560, h: 500 });
  const result = preserveMapPositions([node('a', 0, 0), node('b', 760, 0), node('c', 0, 320)], old, expanded);
  expect(result.find(n => n.id === 'b')!.position).toEqual({ x: 760, y: 0 });
  expect(result.find(n => n.id === 'c')!.position).toEqual({ x: 0, y: 700 });
});
