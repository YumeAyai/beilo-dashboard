import { action, computed, makeObservable, observable, runInAction } from 'mobx';

import { ServiceCard } from '../../domain/card';
import type { XY } from '../../geometry';
import { XYWH } from '../../geometry';
import { CARD_HEIGHT, CARD_WIDTH } from '../../service-map/types';
import { PlacementStrategy } from '../abstract/placement';

import { sizes } from '../../vars';

export const PlacementKind = {
  FromWorld: 'FromWorld',
  ToWorld: 'ToWorld',
  AnotherNamespace: 'AnotherNamespace',
  InsideWithConnections: 'InsideWithConnections',
  InsideWithoutConnections: 'InsideWithoutConnections',
  OutsideManaged: 'OutsideManaged',
} as const;

export type PlacementKind = typeof PlacementKind[keyof typeof PlacementKind];

export interface PlacementMeta {
  kind: PlacementKind;
  card: ServiceCard;
  weight: number;
}

export interface PlacementEntry {
  kind: PlacementKind;
  card: ServiceCard;
  geometry: XYWH;
}

export interface EntriesGroup {
  entries: PlacementEntry[];
  bbox: XYWH;
}

type PlacementFilter = (e: PlacementEntry) => boolean;
type CardsPlacement = Map<string, PlacementEntry>;
type CardsColumns = Map<string, PlacementMeta[][]>;

export class ServiceMapPlacementStrategy extends PlacementStrategy {
  public cards: ServiceCard[] = [];
  public connections: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    makeObservable(this, {
      cards: observable,
      connections: observable,
      cardsList: computed,
      bbox: computed,
      namespaceBBox: computed,
      rebuild: action.bound,
    });
  }

  public setCards(cards: ServiceCard[]) {
    this.cards = cards;
  }

  public setConnections(connections: Map<string, Set<string>>) {
    this.connections = connections;
  }

  public reset() {
    runInAction(() => {
      super.reset();
      this.cards = [];
      this.connections = new Map();
    });
  }

  public rebuild() {
    this.cardsPlacement.forEach((plcEntry: PlacementEntry, cardId: string) => {
      this.cardsXYs.set(cardId, { x: plcEntry.geometry.x, y: plcEntry.geometry.y });
    });
  }

  public get cardsList(): ServiceCard[] {
    return this.cards;
  }

  public get bbox(): XYWH {
    let width = 0;
    let height = 0;
    let x = 0;
    let y = 0;

    this.cardsXYs.forEach((xy: XY, cardId: string) => {
      const wh = this.cardsWHs.get(cardId);
      if (wh == null) return;

      width = Math.max(width, xy.x + wh.w);
      height = Math.max(height, xy.y + wh.h);
      x = Math.min(x, xy.x);
      y = Math.min(y, xy.y);
    });

    return XYWH.fromArgs(x, y, width, height);
  }

  public get namespaceBBox(): XYWH | null {
    return this.cardsBBox(e => {
      const one = e.kind === PlacementKind.InsideWithConnections;
      const two = e.kind === PlacementKind.InsideWithoutConnections;
      return one || two;
    });
  }

  private cardsBBox(filterFn: PlacementFilter): XYWH | null {
    const bbox = { x: Infinity, y: Infinity, w: 0, h: 0 };

    this.cardsPlacement.forEach((e: PlacementEntry) => {
      if (!filterFn(e)) return;

      const { x, y, w, h } = e.geometry;

      bbox.x = Math.min(bbox.x, x);
      bbox.y = Math.min(bbox.y, y);
      bbox.w = Math.max(bbox.w, x + w);
      bbox.h = Math.max(bbox.h, y + h);
    });

    if (!Number.isFinite(bbox.x)) return null;

    bbox.w -= bbox.x;
    bbox.h -= bbox.y;

    return XYWH.fromArgs(bbox.x, bbox.y, bbox.w, bbox.h);
  }

  private get cardsPlacement(): CardsPlacement {
    const groups = this.placementGroups;
    const columns: Map<string, PlacementMeta[][]> = new Map();

    groups.forEach((placements: Set<PlacementMeta>, kind: PlacementKind) => {
      const kindColumns = this.buildPlacementColumns(placements);
      columns.set(kind, kindColumns);
    });

    const placement = this.assignCoordinates(columns);
    return placement;
  }

  private get placementGroups() {
    const index: Map<PlacementKind, Set<PlacementMeta>> = new Map();

    this.cards.forEach((card: ServiceCard) => {
      const meta = this.getCardPlacementMeta(card);
      const kindSet = index.get(meta.kind) ?? new Set();
      kindSet.add(meta);
      index.set(meta.kind, kindSet);
    });

    return index;
  }

  private getCardPlacementMeta(card: ServiceCard): PlacementMeta {
    const senders = this.connections.get(card.id);
    const receivers = this.connections.get(card.id);

    const incomingsCount = senders?.size || 0;
    const outgoingsCount = receivers?.size || 0;

    const props = this.findSpecialInteractions(card);

    let kind: PlacementKind = PlacementKind.InsideWithoutConnections;
    if (card.isHost || card.isRemoteNode) {
      kind = PlacementKind.FromWorld;
    } else if (card.isWorld) {
      kind = incomingsCount > 0 ? PlacementKind.ToWorld : PlacementKind.FromWorld;
    } else if (incomingsCount > 0 || outgoingsCount > 0) {
      kind = PlacementKind.InsideWithConnections;
    }

    let weight = -incomingsCount + outgoingsCount;
    weight += props.hasWorldAsSender || props.hasHostAsSender ? 1000 : 0;
    weight += props.hasWorldAsReceiver ? 500 : 0;

    return { kind, card, weight };
  }

  private findSpecialInteractions(card: ServiceCard) {
    let hasWorldAsSender = false;
    let hasHostAsSender = false;
    let hasWorldAsReceiver = false;

    this.connections.forEach((targets, senderId) => {
      if (!targets.has(card.id)) return;
      const sender = this.cards.find(c => c.id === senderId);
      if (!sender) return;

      hasWorldAsSender = hasWorldAsSender || sender.isWorld;
      hasHostAsSender = hasHostAsSender || sender.isHost;
    });

    this.connections.forEach((targets) => {
      if (!targets.has(card.id)) return;
      hasWorldAsReceiver = hasWorldAsReceiver || card.isWorld;
    });

    return { hasWorldAsReceiver, hasWorldAsSender, hasHostAsSender };
  }

  private buildPlacementColumns(plcs: Set<PlacementMeta>): PlacementMeta[][] {
    const sorted = Array.from(plcs).sort((a, b) => b.weight - a.weight);
    const maxCardsInColumn = Math.ceil(Math.sqrt(plcs.size));

    const columns: PlacementMeta[][] = [];
    let curColumn: PlacementMeta[] = [];
    let curWeight: number | null = null;

    const flushColumn = () => {
      columns.push(curColumn);
      curColumn = [];
    };

    sorted.forEach((plc: PlacementMeta, i: number) => {
      const maxCardsReached = curColumn.length >= maxCardsInColumn;
      const weightChanged = curWeight != null && plc.weight !== curWeight;

      if (maxCardsReached || weightChanged) flushColumn();

      curWeight = plc.weight;
      curColumn.push(plc);

      if (i === sorted.length - 1) flushColumn();
    });

    return columns;
  }

  private assignCoordinates(columns: CardsColumns): CardsPlacement {
    const placement: CardsPlacement = new Map();

    const top = this.alignColumns(columns, [PlacementKind.ToWorld]);
    const middle = this.alignColumns(columns, [
      PlacementKind.FromWorld,
      PlacementKind.InsideWithConnections,
      PlacementKind.InsideWithoutConnections,
    ]);
    const bottom = this.alignColumns(columns, [PlacementKind.AnotherNamespace]);

    const toOutside = top.get(PlacementKind.ToWorld);
    const fromOutside = middle.get(PlacementKind.FromWorld);
    const insideWithConns = middle.get(PlacementKind.InsideWithConnections);
    const insideNoConns = middle.get(PlacementKind.InsideWithoutConnections);
    const anotherNs = bottom.get(PlacementKind.AnotherNamespace);

    const shiftEntries = (shift: XY, entries: PlacementEntry[]) => {
      entries.forEach((entry: PlacementEntry) => {
        entry.geometry.x += shift.x;
        entry.geometry.y += shift.y;
      });
    };

    const shiftToInsideCenter = (bbox: XYWH): XY => {
      const insideBBox = insideWithConns?.bbox;
      if (!insideBBox) return { x: 0, y: 0 };

      const relativeOffset = insideBBox.x - bbox.x;
      const bboxDiff = (insideBBox.w - bbox.w) / 2;
      return { x: relativeOffset + bboxDiff, y: 0 };
    };

    if (insideWithConns != null && toOutside != null) {
      shiftEntries(shiftToInsideCenter(toOutside.bbox), toOutside.entries);
    }

    if (toOutside != null) {
      const middleShift = {
        x: 0,
        y: toOutside.bbox.h + 2 * sizes.namespaceBackplatePadding,
      };

      if (fromOutside) shiftEntries(middleShift, fromOutside.entries);
      if (insideWithConns) shiftEntries(middleShift, insideWithConns.entries);
      if (insideNoConns) shiftEntries(middleShift, insideNoConns.entries);
    }

    if (anotherNs != null) {
      let shiftY = 0;
      if (toOutside != null) shiftY += toOutside.bbox.h + 2 * sizes.namespaceBackplatePadding;

      let middleHeight = 0;
      if (fromOutside) middleHeight = Math.max(middleHeight, fromOutside.bbox.h);
      if (insideWithConns) middleHeight = Math.max(middleHeight, insideWithConns.bbox.h);
      if (insideNoConns) middleHeight = Math.max(middleHeight, insideNoConns.bbox.h);

      if (middleHeight > Number.EPSILON) {
        shiftY += middleHeight + 2 * sizes.namespaceBackplatePadding;
      }

      if (insideWithConns != null) {
        const insideShift = shiftToInsideCenter(anotherNs.bbox);
        shiftEntries({ x: insideShift.x, y: shiftY }, anotherNs.entries);
      } else {
        shiftEntries({ x: 0, y: shiftY }, anotherNs.entries);
      }
    }

    const copyEntries = (entries: PlacementEntry[]) => {
      entries.forEach(entry => {
        placement.set(entry.card.id, entry);
      });
    };

    if (toOutside) copyEntries(toOutside.entries);
    if (fromOutside) copyEntries(fromOutside.entries);
    if (insideWithConns) copyEntries(insideWithConns.entries);
    if (insideNoConns) copyEntries(insideNoConns.entries);
    if (anotherNs) copyEntries(anotherNs.entries);

    return placement;
  }

  private alignColumns(
    cardsColumns: CardsColumns,
    kinds: PlacementKind[],
  ): Map<PlacementKind, EntriesGroup> {
    const alignment = new Map();

    const columnHeights: Map<PlacementEntry[], number> = new Map();
    const offset = { x: 0, y: 0 };
    let entireHeight = 0;

    kinds.forEach(kind => {
      const columns = cardsColumns.get(kind);
      if (columns == null) return;

      const entries: PlacementEntry[] = [];
      const bbox = XYWH.fromArgs(offset.x, offset.y, 0, 0);

      columns.forEach((column: PlacementMeta[], ci: number) => {
        const columnEntries: PlacementEntry[] = [];

        let columnWidth = 0;
        let columnHeight = 0;
        offset.y = 0;

        column.forEach((meta: PlacementMeta, ri: number) => {
          let cardWH = this.cardsDimensions.get(meta.card.id);
          if (cardWH == null) {
            cardWH = { w: CARD_WIDTH, h: CARD_HEIGHT };
          }

          const geometry = XYWH.fromArgs(offset.x, offset.y, cardWH.w, cardWH.h);

          const entry: PlacementEntry = {
            card: meta.card,
            kind: meta.kind,
            geometry,
          };

          entries.push(entry);
          columnEntries.push(entry);

          columnWidth = Math.max(columnWidth, cardWH.w);
          columnHeight += cardWH.h + (ri === 0 ? 0 : sizes.endpointVPadding);
          offset.y += cardWH.h + sizes.endpointVPadding;
        });

        columnHeights.set(columnEntries, columnHeight);
        offset.x += columnWidth + sizes.endpointHPadding;
        bbox.w += columnWidth + (ci === 0 ? 0 : sizes.endpointHPadding);
        bbox.h = Math.max(bbox.h, offset.y - sizes.endpointVPadding);
        entireHeight = Math.max(entireHeight, bbox.h);
      });

      alignment.set(kind, { entries, bbox });
    });

    columnHeights.forEach((columnHeight: number, entries: PlacementEntry[]) => {
      if (entries.length === 0) return;

      const verticalOffset = (entireHeight - columnHeight) / 2;

      entries.forEach(entry => {
        entry.geometry.y += verticalOffset;
      });
    });

    return alignment;
  }
}