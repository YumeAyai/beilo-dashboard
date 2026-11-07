import { makeObservable, observable } from 'mobx';
import { XYWH } from './geometry';

export interface IdentifierBBox {
  id: string;
  bbox: XYWH;
}

export interface APIdentifierBBox {
  id: string;
  cardId: string;
  bbox: XYWH;
}

export interface AllCoords {
  accessPoints: APIdentifierBBox[];
  cards: IdentifierBBox[];
}

export type CoordsCallback = (coords: AllCoords) => void;

export class RefsCollector {
  public cardRoots: Map<string, Element> = new Map();
  public accessPoints: Map<string, Element> = new Map();
  private coordsCallback: CoordsCallback | null = null;
  private throttledCardsUpdated: (() => void) | null = null;
  private frame: number | null = null;

  constructor() {
    makeObservable(this, {
      cardRoots: observable,
      accessPoints: observable,
    });
  }

  public onCoordsUpdated(fn: CoordsCallback): this {
    this.coordsCallback = fn;
    return this;
  }

  public cardRoot(cardId: string): (el: Element | null) => void {
    return (el: Element | null) => {
      if (el) this.cardRoots.set(cardId, el);
      else this.cardRoots.delete(cardId);
      this.scheduleCollect();
    };
  }

  public accessPointConnector(apId: string): (el: Element | null) => void {
    return (el: Element | null) => {
      if (el) this.accessPoints.set(apId, el);
      else this.accessPoints.delete(apId);
      this.scheduleCollect();
    };
  }

  public cardsMutationsObserved() {
    this.scheduleCollect();
  }

  private scheduleCollect() {
    if (this.throttledCardsUpdated) return;

    this.throttledCardsUpdated = () => {
      this.throttledCardsUpdated = null;
      this.frame = null;
      this.cardsUpdated();
    };

    this.frame = requestAnimationFrame(this.throttledCardsUpdated);
  }

  private cardsUpdated() {
    if (!this.coordsCallback) return;

    const cardCoords: IdentifierBBox[] = [];
    const apCoords: APIdentifierBBox[] = [];

    const firstEl = this.cardRoots.values().next().value || this.accessPoints.values().next().value;
    if (!firstEl) return;

    const svg = firstEl.closest('svg');
    if (!svg || !svg.getScreenCTM) return;

    const g = svg.querySelector('g');
    if (!g) return;

    const m = (g.getScreenCTM?.() ?? svg.getScreenCTM())?.inverse();
    if (!m) return;

    this.cardRoots.forEach((cardRoot, cardId) => {
      if (!cardRoot || !cardRoot.getBoundingClientRect) return;

      const rect = cardRoot.getBoundingClientRect();
      const bbox = this.applyDOMMatrix(
        { x: rect.x, y: rect.y, w: rect.width, h: rect.height } as XYWH,
        m,
      );

      cardCoords.push({ id: cardId, bbox });
    });

    this.accessPoints.forEach((apEl, apId) => {
      if (!apEl || !apEl.getBoundingClientRect) return;

      const rect = apEl.getBoundingClientRect();
      const cardId = apId.split('->')[0];
      const bbox = this.applyDOMMatrix(
        { x: rect.x, y: rect.y, w: rect.width, h: rect.height } as XYWH,
        m,
      );

      apCoords.push({ id: apId, cardId, bbox });
    });

    this.coordsCallback({
      accessPoints: apCoords,
      cards: cardCoords,
    });
  }

  private applyDOMMatrix(bbox: XYWH, matrix: DOMMatrix): XYWH {
    const tl = { x: bbox.x, y: bbox.y };
    const br = { x: bbox.x + bbox.w, y: bbox.y + bbox.h };

    const tlp = new DOMPoint(tl.x, tl.y).matrixTransform(matrix);
    const brp = new DOMPoint(br.x, br.y).matrixTransform(matrix);

    return XYWH.fromArgs(
      Math.min(tlp.x, brp.x),
      Math.min(tlp.y, brp.y),
      Math.abs(brp.x - tlp.x),
      Math.abs(brp.y - tlp.y),
    );
  }

  public clear() {
    this.cardRoots.clear();
    this.accessPoints.clear();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.throttledCardsUpdated = null;
    this.coordsCallback = null;
  }
}