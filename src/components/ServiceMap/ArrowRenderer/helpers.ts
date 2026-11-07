import { sizes } from '../domain/sizes';
import {
  Line2,
  Vec2,
  distance as geomDistance,
  linterp2 as geomLinterp2,
  pointSideOfLine as geomPointSideOfLine,
  roundCorner as geomRoundCorner,
} from '../geometry';
import { ServiceMapArrow } from '../service-map/arrow-core';

// NOTE: ArrowHandle is a small triangle rendered on the middle of the arrow
export type ArrowHandle = [Vec2, Vec2];
export type Vec2Tuple = [Vec2, Vec2];

export const collectHandles = (arrow: ServiceMapArrow): ArrowHandle[] => {
  const points = arrow.points;
  if (points.length < 2) return [];

  const handles: ArrowHandle[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    if (i === points.length - 2) break; // last segment doesn't get a handle
    const start = points[i];
    const end = points[i + 1];
    if (geomDistance(start, end) < sizes.minArrowLength) continue;

    const startVec = Vec2.fromXY(start);
    const endVec = Vec2.fromXY(end);

    const mid = startVec.linterp(endVec, 0.5);
    const direction = endVec.sub(startVec).normalize();

    if (direction.isZero()) continue;

    const handleLength = sizes.arrowHandleWidth;
    const handleFrom = mid.sub(direction.mul(handleLength / 2));
    const handleTo = mid.add(direction.mul(handleLength / 2));

    handles.push([handleFrom, handleTo]);
  }

  return handles;
};

export const arrowHandleId = (handle: ArrowHandle, arrow: ServiceMapArrow): string => {
  const [from, to] = handle;
  const mid = geomLinterp2(from, to, 0.5);
  return `${arrow.id}-${Math.trunc(mid.x)},${Math.trunc(mid.y)}`;
};

const arrowHandlePath = (handle: ArrowHandle | null): string => {
  if (handle == null) return '';

  const [start, end] = handle;
  const width = start.distance(end);

  const line = Line2.throughPoints(start, end);
  const side = line.normal.mul(width / 2);

  const baseA = start.add(side);
  const baseB = start.sub(side);

  const sweep = geomPointSideOfLine(start, end, baseA) > 0 ? 0 : 1;

  const r = 2;
  const [ar1, ar2] = geomRoundCorner(r, [start, baseA, end]);
  const [br1, br2] = geomRoundCorner(r, [start, baseB, end]);
  const [er1, er2] = geomRoundCorner(r, [baseA, end, baseB]);

  return `
    M ${start.x} ${start.y}
    L ${ar1.x} ${ar1.y}
    A ${r} ${r} 0 0 ${sweep} ${ar2.x} ${ar2.y}
    L ${er1.x} ${er1.y}
    A ${r} ${r} 0 0 ${sweep} ${er2.x} ${er2.y}
    L ${br2.x} ${br2.y}
    A ${r} ${r} 0 0 ${sweep} ${br1.x} ${br1.y}
    Z
  `;
};

const arrowLinePath = (points: { x: number; y: number }[]): string => {
  if (points.length < 2) return '';

  const first = points[0];
  const last = points[points.length - 1];

  if (points.length === 2) {
    return `M ${first.x} ${first.y} L ${last.x} ${last.y}`;
  }

  const r = sizes.arrowRadius;

  let line = `M ${first.x} ${first.y}`;

  for (let i = 0; i < points.length - 2; i++) {
    const a = points[i];
    const b = points[i + 1];
    const c = points[i + 2];

    let [d, e, angle] = geomRoundCorner(r, [a, b, c]);

    if (angle < Math.PI / 4) {
      [d, e, angle] = geomRoundCorner(r * Math.sin(angle), [a, b, c]);
    }

    const ab = Vec2.from(b.x - a.x, b.y - a.y);
    const bc = Vec2.from(c.x - b.x, c.y - b.y);
    const sweep = ab.isClockwise(bc) ? 0 : 1;

    line += `
      L ${d.x} ${d.y}
      A ${r} ${r} 0 0 ${sweep} ${e.x} ${e.y}
    `;
  }

  line += `L ${last.x} ${last.y}`;
  return line;
};

const startPlatePath = (lineEnding: { x: number; y: number }) => {
  const { x, y } = lineEnding;

  const r = 3, w = 5, h = 20;
  const tr = `a ${r} ${r} 0 0 1 ${r} ${r}`;
  const br = `a ${r} ${r} 0 0 1 -${r} ${r}`;

  return `
    M ${x - 1} ${y - h / 2}
    h ${w - r}
    ${tr}
    v ${h - 2 * r}
    ${br}
    h -${w - r}
    z
  `;
};

export const svg = {
  arrowHandlePath,
  arrowLinePath,
  startPlatePath,
};
