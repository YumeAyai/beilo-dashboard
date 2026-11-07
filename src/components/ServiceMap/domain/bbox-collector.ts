import { XYWH } from '../geometry';

export interface CardBBox { id: string; bbox: XYWH }
export interface APBBox extends CardBBox { cardId: string }
export interface AllCoords { cards: CardBBox[]; accessPoints: APBBox[] }
type CoordsCallback = (coords: AllCoords) => void;

export class BBoxCollector {
  private cardElements = new Map<string, Element>();
  private apElements = new Map<string, { cardId: string; el: Element }>();
  private callback: CoordsCallback | null = null;
  private frame: number | null = null;

  onCoordsUpdated(fn: CoordsCallback | null): this {
    this.callback = fn;
    if (fn) this.refresh();
    return this;
  }

  registerCard(id: string, el: Element): void {
    this.cardElements.set(id, el);
    this.refresh();
  }

  registerAccessPoint(id: string, cardId: string, el: Element): void {
    this.apElements.set(id, { cardId, el });
    this.refresh();
  }

  removeCard(id: string): void {
    this.cardElements.delete(id);
    this.refresh();
  }

  removeAccessPoint(id: string): void {
    this.apElements.delete(id);
    this.refresh();
  }

  clear(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.callback = null;
    this.cardElements.clear();
    this.apElements.clear();
  }

  refresh(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.collect();
    });
  }

  private collect(): void {
    if (!this.callback) return;
    const first = this.cardElements.values().next().value ?? this.apElements.values().next().value?.el;
    if (!first) {
      this.callback({ cards: [], accessPoints: [] });
      return;
    }
    const svg = first.closest('svg');
    // The first group is the map's pan/zoom transform. Convert back into model
    // coordinates so zooming does not change measured card dimensions.
    const root = svg?.querySelector('g');
    const matrix = root?.getScreenCTM?.() ?? svg?.getScreenCTM?.();
    if (!matrix) return;
    const inverse = matrix.inverse();
    const measure = (el: Element): XYWH => {
      const rect = el.getBoundingClientRect();
      const a = new DOMPoint(rect.left, rect.top).matrixTransform(inverse);
      const b = new DOMPoint(rect.right, rect.bottom).matrixTransform(inverse);
      return XYWH.fromArgs(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    };
    this.callback({
      cards: Array.from(this.cardElements, ([id, el]) => ({ id, bbox: measure(el) })),
      accessPoints: Array.from(this.apElements, ([id, { cardId, el }]) => ({ id, cardId, bbox: measure(el) })),
    });
  }
}
