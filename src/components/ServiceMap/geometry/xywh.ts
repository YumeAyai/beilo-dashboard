import type { XY, WH } from './general';
import { tooSmall } from './general';

export interface Sides {
  top: [XY, XY];
  bottom: [XY, XY];
  left: [XY, XY];
  right: [XY, XY];
}

export class XYWHImpl implements XY, WH {
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  public static fromArgs(x: number, y: number, w: number, h: number): XYWHImpl {
    return new XYWHImpl(x, y, w, h);
  }

  public static fromParts(xy: XY, wh: WH): XYWHImpl {
    return new XYWHImpl(xy.x, xy.y, wh.w, wh.h);
  }

  public static fromDOMRect(dr: DOMRect): XYWHImpl {
    return new XYWHImpl(dr.x, dr.y, dr.width, dr.height);
  }

  public static empty(): XYWHImpl {
    return new XYWHImpl(0, 0, 0, 0);
  }

  public applyDOMMatrix(m: DOMMatrix): XYWHImpl {
    const xy = new DOMPoint(this.x, this.y);
    const txy = xy.matrixTransform(m);

    const w = this.w * m.a;
    const h = this.h * m.d;

    return XYWHImpl.fromArgs(txy.x, txy.y, w, h);
  }

  public addMargin(t: number, r?: number, b?: number, l?: number): XYWHImpl {
    let effR: number, effB: number, effL: number;

    if (r == null) {
      effL = t;
      effR = t;
      effB = t;
    } else if (b == null) {
      effB = t;
      effL = r;
      effR = r;
    } else if (l == null) {
      effB = b;
      effL = r;
      effR = r;
    } else {
      effB = b;
      effL = l;
      effR = r;
    }

    const x = this.x - effL;
    const y = this.y - t;
    const w = this.w + effL + effR;
    const h = this.h + t + effB;

    return XYWHImpl.fromArgs(x, y, w, h);
  }

  public transform(dx: number, dy: number, scale?: number): XYWHImpl {
    scale = scale || 1.0;

    return XYWHImpl.fromArgs(this.x + dx, this.y + dy, this.w * scale, this.h * scale);
  }

  public setWH(wh: WH): XYWHImpl {
    return XYWHImpl.fromArgs(this.x, this.y, wh.w, wh.h);
  }

  public setHeight(h: number): XYWHImpl {
    return XYWHImpl.fromArgs(this.x, this.y, this.w, h);
  }

  public setXY(x?: number, y?: number): XYWHImpl {
    return XYWHImpl.fromArgs(x ?? this.x, y ?? this.y, this.w, this.h);
  }

  public addXY(dx: number, dy: number, inPlace = true): XYWHImpl {
    if (inPlace) {
      this.x += dx;
      this.y += dy;

      return this;
    }

    return XYWHImpl.fromArgs(this.x + dx, this.y + dy, this.w, this.h);
  }

  public centerRelativeTo(xy: XY): XY {
    return {
      x: this.center.x - xy.x,
      y: this.center.y - xy.y,
    };
  }

  public equals(rhs?: XYWHImpl | null): boolean {
    if (rhs == null) return false;

    return (
      tooSmall(this.x - rhs.x) &&
      tooSmall(this.y - rhs.y) &&
      tooSmall(this.w - rhs.w) &&
      tooSmall(this.h - rhs.h)
    );
  }

  public get sides(): Sides {
    const leftX = this.x;
    const rightX = this.x + this.w;

    const topY = this.y;
    const bottomY = this.y + this.h;

    return {
      top: [
        { x: leftX, y: topY },
        { x: rightX, y: topY },
      ],
      bottom: [
        { x: leftX, y: bottomY },
        { x: rightX, y: bottomY },
      ],
      left: [
        { x: leftX, y: topY },
        { x: leftX, y: bottomY },
      ],
      right: [
        { x: rightX, y: topY },
        { x: rightX, y: bottomY },
      ],
    };
  }

  public get isFinite(): boolean {
    return (
      Number.isFinite(this.x) &&
      Number.isFinite(this.y) &&
      Number.isFinite(this.w) &&
      Number.isFinite(this.h)
    );
  }

  public get isEmpty(): boolean {
    return tooSmall(this.x) && tooSmall(this.y) && tooSmall(this.w) && tooSmall(this.h);
  }

  public get xy(): XY {
    return { x: this.x, y: this.y };
  }

  public get wh(): WH {
    return { w: this.w, h: this.h };
  }

  public get center(): XY {
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }
}

// Alias for backward compatibility
export const XYWH = XYWHImpl;

// Type alias for XYWHImpl
export type XYWH = XYWHImpl;