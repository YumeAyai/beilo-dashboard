import { action, computed, makeObservable } from 'mobx';

import type { WH, XY } from '../../geometry';
import { XYWH } from '../../geometry';

export abstract class PlacementStrategy {
  protected cardsWHs: Map<string, WH> = new Map();
  protected cardsXYs: Map<string, XY> = new Map();
  protected _accessPointCoords: Map<string, XY> = new Map();

  constructor() {
    makeObservable(this);
  }

  public abstract get bbox(): XYWH;

  @action.bound
  public reset() {
    this.cardsWHs.clear();
    this.cardsXYs.clear();
    this._accessPointCoords.clear();
  }

  @action.bound
  public getCardCoords(cardId: string): XY | null {
    return this.cardsXYs.get(cardId) || null;
  }

  @action.bound
  public getCardDimensions(cardId: string): WH | null {
    return this.cardsWHs.get(cardId) || null;
  }

  @action.bound
  public getCardXYWH(cardId: string): XYWH | null {
    const xy = this.getCardCoords(cardId);
    if (xy == null) return null;

    const wh = this.getCardDimensions(cardId);
    if (wh == null) return null;

    return XYWH.fromParts(xy, wh);
  }

  @action.bound
  public getCardXYWHOrDefault(cardId: string): XYWH {
    const real = this.getCardXYWH(cardId);
    if (real != null) return real;

    return this.defaultCardXYWH();
  }

  @action.bound
  public setCardWH(cardId: string, wh: WH) {
    this.cardsWHs.set(cardId, { w: wh.w, h: wh.h });
  }

  @action.bound
  public defaultCardXYWH(): XYWH {
    return new XYWH(-100500, -100500, this.defaultCardW, this.defaultCardH);
  }

  @action.bound
  public setCardWidth(cardId: string, width: number) {
    const cardWH = this.cardsWHs.get(cardId);

    this.cardsWHs.set(cardId, {
      w: width,
      h: cardWH ? cardWH.h : this.defaultCardH,
    });
  }

  @action.bound
  public setCardHeight(cardId: string, height: number, eps?: number): boolean {
    const cardWH = this.cardsWHs.get(cardId);

    if (cardWH == null) {
      this.cardsWHs.set(cardId, {
        w: this.defaultCardW,
        h: height,
      });
      return true;
    } else {
      if (eps != null && Math.abs(cardWH.h - height) < eps) return false;

      this.cardsWHs.set(cardId, {
        w: cardWH.w,
        h: height,
      });
      return true;
    }
  }

  @action.bound
  public setCardHeights(coords: { id: string; bbox: XYWH }[], eps?: number): number {
    let nupdated = 0;

    coords.forEach(c => {
      if (c.bbox.h < 0) return;
      if (this.setCardHeight(c.id, c.bbox.h, eps)) nupdated++;
    });

    return nupdated;
  }

  @action.bound
  public setAccessPointCoords(apId: string, xy: XY, eps?: number): boolean {
    if (eps != null) {
      const current = this._accessPointCoords.get(apId);

      if (current != null) {
        const dx = Math.abs(xy.x - current.x);
        const dy = Math.abs(xy.y - current.y);

        if (dx <= eps && dy <= eps) return false;
      }
    }

    this._accessPointCoords.set(apId, xy);
    return true;
  }

  @computed
  get accessPointCoords(): Map<string, XY> {
    return new Map(this._accessPointCoords);
  }

  @computed
  get cardsDimensions(): Map<string, WH> {
    return new Map(this.cardsWHs);
  }

  @computed
  get cardsCoords(): Map<string, XY> {
    return new Map(this.cardsXYs);
  }

  @computed
  get cardsBBoxes(): Map<string, XYWH> {
    const bboxes = new Map();

    this.cardsWHs.forEach((dims, cardId) => {
      const coords = this.cardsXYs.get(cardId);
      if (coords == null) return;

      bboxes.set(cardId, XYWH.fromParts(coords, dims));
    });

    return bboxes;
  }

  @computed
  public get defaultCardW(): number {
    return 260;
  }

  @computed
  public get defaultCardH(): number {
    return 180;
  }

  @computed
  public get numCards(): number {
    return Math.min(this.cardsXYs.size, this.cardsWHs.size);
  }
}