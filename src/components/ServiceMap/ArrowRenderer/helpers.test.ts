import { expect, it } from 'vitest';
import { ServiceMapArrow } from '../service-map/arrow-core';
import { collectHandles } from './helpers';

it('keeps the handles collected before the final segment', () => {
  const arrow = new ServiceMapArrow().setPoints([{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }]);
  const handles = collectHandles(arrow);
  expect(handles).toHaveLength(1);
  const [from, to] = handles[0];
  expect((from.x + to.x) / 2).toBe(250);
  expect(from.y).toBe(0);
  expect(to.y).toBe(0);
  expect(to.x).toBeGreaterThan(from.x);
  expect(collectHandles(new ServiceMapArrow().setPoints([{ x: 0, y: 0 }, { x: 500, y: 0 }]))).toEqual([]);
});
