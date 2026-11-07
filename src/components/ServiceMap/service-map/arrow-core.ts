import { Vec2, type XY, type XYWH, angleBetweenSegments, goAroundTheBox } from '../geometry';

export const SIZES = {
  connectorCardStartGap: 40,
  connectorCardEndGap: 120,
  minArrowLength: 50,
  arrowStartTopOffset: 50,
  arrowHandleWidth: 20,
  arrowRadius: 5,
  arrowOverlapGap: 20,
  aroundCardPadX: 40,
  aroundCardPadY: 40,
  linkWidth: 2,
  connectorWidth: 4,
  feetOuterWidth: 4,
  feetInnerWidth: 2,
  feetInnerWidthThick: 6,
  flowsIndicatorOffset: 20,
  namespaceBackplatePadding: 200,
  endpointVPadding: 200,
  endpointHPadding: 200,
  distanceBetweenConnectors: 50,
};

export class Arrow {
  protected _points: XY[] = [];

  get start(): XY | null {
    return this._points.length > 0 ? this._points[0] : null;
  }

  get end(): XY | null {
    return this._points.length > 1 ? this._points[this._points.length - 1] : null;
  }

  get points(): XY[] {
    return this._points;
  }

  addPoint(p: XY): this {
    this._points.push(p);
    return this;
  }

  setPoints(pts: XY[]): this {
    this._points = pts;
    return this;
  }
}

export const AuthType = {
  Spire: 'spire',
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];

export class AccessPointArrow extends Arrow {
  public connectorId: string | null = null;
  public accessPointId: string | null = null;
  public verdicts: Set<string> = new Set();
  public authTypes: Set<AuthType> = new Set();
  public isEncrypted = false;

  get id(): string {
    return `${this.connectorId ?? ''} -> ${this.accessPointId ?? ''}`;
  }

  get hasAbnormalVerdict(): boolean {
    return this.verdicts.has('DROPPED') || this.verdicts.has('DENIED') || this.verdicts.has('ERROR');
  }

  get hasAuth(): boolean {
    return this.authTypes.has(AuthType.Spire);
  }

  fromConnector(connectorId: string): this {
    this.connectorId = connectorId;
    return this;
  }

  toAccessPoint(accessPointId: string): this {
    this.accessPointId = accessPointId;
    return this;
  }

  addVerdicts(verdicts: Set<string>): this {
    verdicts.forEach(v => this.verdicts.add(v.toUpperCase()));
    return this;
  }

  addAuthTypes(authTypes: Set<AuthType>): this {
    authTypes.forEach(at => this.authTypes.add(at));
    return this;
  }

  setEncryption(encrypted: boolean): this {
    this.isEncrypted = encrypted;
    return this;
  }
}

export class ServiceMapArrow extends Arrow {
  public senderId: string | null = null;
  public senderBBox: XYWH | null = null;
  public receiverId: string | null = null;
  public receiverBBox: XYWH | null = null;
  public accessPointArrows: Map<string, AccessPointArrow> = new Map();
  private _flowsInfoIndicatorCoords: XY | null = null;

  get id(): string {
    return `${this.senderId ?? ''} -> ${this.receiverId ?? ''}`;
  }

  get flowsInfoIndicatorCoords(): XY | null {
    return this._flowsInfoIndicatorCoords;
  }

  from(senderId: string, bbox?: XYWH): this {
    this.senderId = senderId;
    this.senderBBox = bbox || null;
    return this;
  }

  to(receiverId: string, bbox?: XYWH): this {
    this.receiverId = receiverId;
    this.receiverBBox = bbox || null;
    return this;
  }

  addAccessPointArrow(connectorId: string, apId: string): AccessPointArrow {
    const apArrow = new AccessPointArrow()
      .fromConnector(connectorId)
      .toAccessPoint(apId);
    this.accessPointArrows.set(apArrow.id, apArrow);
    return apArrow;
  }

  buildPointsAroundSenderAndReceiver(
    offsets: CardOffsets,
  ): this {
    const start = this.start;
    const end = this.end;
    if (
      start == null ||
      end == null ||
      this.senderId == null ||
      this.receiverId == null ||
      this.senderBBox == null ||
      this.receiverBBox == null
    ) {
      return this;
    }

    const startPoint = Vec2.fromXY(start);
    const endPoint = Vec2.fromXY(end);

    const shiftedStart = startPoint.add({ x: SIZES.connectorCardStartGap, y: 0 });
    const shiftedEnd = endPoint.sub({ x: SIZES.connectorCardStartGap, y: 0 });

    const receiverIsOnTheLeft = startPoint.x > endPoint.x;
    if (!receiverIsOnTheLeft) {
      this._points.splice(1, 0, shiftedStart, shiftedEnd);
      return this;
    }

    const points1 = goAroundTheBox(
      this.senderBBox,
      shiftedStart,
      shiftedEnd,
      SIZES.aroundCardPadX,
      SIZES.aroundCardPadY,
    );

    const senderPoint = points1.at(-1) ?? shiftedStart;
    const aroundOffset = offsets.around.advance(this.receiverId);

    const points2 = goAroundTheBox(
      this.receiverBBox,
      senderPoint,
      shiftedEnd,
      SIZES.aroundCardPadX + aroundOffset,
      SIZES.aroundCardPadY + aroundOffset,
    );

    if (points2.length === 0) offsets.around.rewind(this.receiverId);

    if (points2.length > 0) {
      const lastAroundPoint = points2.at(-1)!;
      const offsetAdvancer = lastAroundPoint.y > senderPoint.y
        ? offsets.bottom
        : offsets.top;
      const offset = offsetAdvancer.advance(this.receiverId);

      lastAroundPoint.x = end.x - offset;
      shiftedEnd.x = end.x - offset;
    }

    this._points.splice(1, 0, shiftedStart, ...points1, ...points2, shiftedEnd);
    this.removeSharpAngleAtConnector();

    return this;
  }

  computeFlowsInfoIndicatorPosition(): void {
    const shiftedEnd = this._points.at(-2);
    const beforeShiftedEnd = this._points.at(-3);
    if (shiftedEnd == null || beforeShiftedEnd == null) return;

    const indicatorCoords = Vec2.fromXY(beforeShiftedEnd)
      .sub(shiftedEnd)
      .normalize();

    this._flowsInfoIndicatorCoords = Vec2.fromXY(shiftedEnd)
      .addInPlace(indicatorCoords.mul(SIZES.flowsIndicatorOffset))
      .xy();
  }

  private removeSharpAngleAtConnector(): void {
    const points = this._points;
    if (points.length < 3) return;

    const [a, b, c] = points.slice(points.length - 3);
    const angleThreshold = Math.PI / 9;
    const angle = angleBetweenSegments(a, b, c);

    if (angle > angleThreshold) return;
    points.splice(points.length - 2, 1);
  }
}

export class CardOffsetAdvancer {
  private _advances: Map<string, number> = new Map();
  private _step: number;

  private initialValue: number;
  constructor(step: number, initialValue = step) {
    this._step = step;
    this.initialValue = initialValue;
  }

  advance(key: string): number {
    const cur = this._advances.get(key) ?? this.initialValue;
    const next = cur + this._step;
    this._advances.set(key, next);
    return cur;
  }

  rewind(key: string): void {
    const cur = this._advances.get(key) ?? this.initialValue;
    const prev = Math.max(0, cur - this._step);
    this._advances.set(key, prev);
  }
}

export interface CardOffsets {
  around: CardOffsetAdvancer;
  top: CardOffsetAdvancer;
  bottom: CardOffsetAdvancer;
}

export function createCardOffsetAdvancers(): CardOffsets {
  return {
    around: new CardOffsetAdvancer(SIZES.arrowOverlapGap, SIZES.aroundCardPadX),
    top: new CardOffsetAdvancer(SIZES.arrowOverlapGap),
    bottom: new CardOffsetAdvancer(SIZES.arrowOverlapGap),
  };
}
