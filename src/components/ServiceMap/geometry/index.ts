export type { XY, WH } from './general';
export { Vec2 } from './vec2';
export { XYWH, XYWHImpl } from './xywh';
export { Position } from './position';
export { Line2 } from './line2';
export { segmentsIntersection } from './intersections';
export { goAroundTheBox } from './rounding';
export * from './utils';

export const dummy = {
  xy(x = 0, y = 0) {
    return { x, y };
  },
  xywh(x = 0, y = 0, w = 0, h = 0) {
    return { x, y, w, h };
  },
  vec2(x = 0, y = 0) {
    return { x, y };
  },
};