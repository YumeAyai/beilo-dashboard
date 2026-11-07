import { CARD_HEIGHT, CARD_WIDTH } from './types';
import type { PositionedNode } from './layout';
import { sizes } from '../vars';

export interface PlacedCard { x: number; y: number; w: number; h: number }
type Dimensions = ReadonlyMap<string, { w: number; h: number }>;
const overlaps = (a: PlacedCard, b: PlacedCard) =>
  a.x < b.x + b.w + sizes.endpointHPadding - 0.5 && a.x + a.w + sizes.endpointHPadding > b.x + 0.5 &&
  a.y < b.y + b.h + sizes.endpointVPadding - 0.5 && a.y + a.h + sizes.endpointVPadding > b.y + 0.5;

// Preserve committed positions in the cluster-wide view. New observations can
// change connection weights, but only new cards or expanded cards need space.
export function preserveMapPositions(proposed: PositionedNode[], previous: ReadonlyMap<string, PlacedCard>, dimensions: Dimensions): PositionedNode[] {
  const occupied: PlacedCard[] = [];
  const positions = new Map<string, PlacedCard>();
  const existing = proposed.filter(node => previous.has(node.id)).sort((a, b) =>
    previous.get(a.id)!.y - previous.get(b.id)!.y || previous.get(a.id)!.x - previous.get(b.id)!.x || a.id.localeCompare(b.id));
  const added = proposed.filter(node => !previous.has(node.id));
  for (const node of [...existing, ...added]) {
    const old = previous.get(node.id);
    const measured = dimensions.get(node.id);
    const card = { x: old?.x ?? node.position.x, y: old?.y ?? node.position.y,
      w: measured?.w ?? CARD_WIDTH, h: measured?.h ?? CARD_HEIGHT };
    let blockers = occupied.filter(other => overlaps(card, other));
    while (blockers.length) {
      card.y = Math.max(...blockers.map(other => other.y + other.h + sizes.endpointVPadding));
      blockers = occupied.filter(other => overlaps(card, other));
    }
    occupied.push(card);
    positions.set(node.id, card);
  }
  return proposed.map(node => ({ ...node, position: { x: positions.get(node.id)!.x, y: positions.get(node.id)!.y } }));
}
