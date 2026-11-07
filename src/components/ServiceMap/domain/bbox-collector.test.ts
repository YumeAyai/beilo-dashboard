// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BBoxCollector } from './bbox-collector';

let queued: Map<number, FrameRequestCallback>;
let frameId = 0;
beforeEach(() => {
  queued = new Map();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { queued.set(++frameId, fn); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queued.delete(id));
  vi.stubGlobal('DOMPoint', class Point {
    x: number; y: number;
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    matrixTransform(m: DOMMatrix) { return { x: this.x * m.a + m.e, y: this.y * m.d + m.f }; }
  });
});
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });
function flush() { const frames = [...queued.values()]; queued.clear(); frames.forEach(fn => fn(0)); }
function element() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const group = document.createElementNS(svg.namespaceURI, 'g');
  const card = document.createElement('div');
  svg.append(group); group.append(card); document.body.append(svg);
  Object.defineProperty(group, 'getScreenCTM', { value: () => ({ inverse: () => ({ a: 0.5, d: 0.5, e: -50, f: -25 }) }) });
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ x: 120, y: 90, left: 120, top: 90, right: 640, bottom: 450, width: 520, height: 360, toJSON: () => ({}) });
  return card;
}

it('batches measurements in model coordinates and preserves the supplied access point owner', () => {
  const collector = new BBoxCollector(); const callback = vi.fn(); const card = element();
  // Ref callbacks run before the parent effect installs its subscriber.
  collector.registerCard('test/card', card);
  collector.registerAccessPoint('opaque-access-point', 'test/card', card);
  collector.onCoordsUpdated(callback);
  expect(queued.size).toBe(1);
  flush();
  const coords = callback.mock.calls[0][0];
  expect(coords.cards[0]).toMatchObject({ id: 'test/card', bbox: { x: 10, y: 20, w: 260, h: 180 } });
  expect(coords.accessPoints[0]).toMatchObject({ id: 'opaque-access-point', cardId: 'test/card' });
  collector.removeCard('test/card'); collector.removeAccessPoint('opaque-access-point'); flush();
  expect(callback).toHaveBeenLastCalledWith({ cards: [], accessPoints: [] });
  collector.clear();
});

it('cancels pending work and releases the callback on cleanup, then supports reuse', () => {
  const collector = new BBoxCollector(); const callback = vi.fn();
  collector.registerCard('one', element()); collector.onCoordsUpdated(callback);
  collector.clear(); flush();
  expect(callback).not.toHaveBeenCalled(); expect(queued.size).toBe(0);
  const next = vi.fn(); collector.registerCard('two', element()); collector.onCoordsUpdated(next); flush();
  expect(next.mock.calls[0][0].cards.map((card: { id: string }) => card.id)).toEqual(['two']);
  collector.clear();
});
