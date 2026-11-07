import { observer } from 'mobx-react';
import React from 'react';
import { NamespaceBoundary } from '../../Topology/NamespaceBoundary';
import { ServiceMapArrowBody } from '../ArrowRenderer/ServiceMapArrowBody';
import { ServiceMapArrowDuckFeet } from '../ArrowRenderer/ServiceMapArrowDuckFeet';
import { RefsCollector } from '../collector';
import { ServiceCard } from '../domain/card';
import { ServiceMapArrowStrategy } from '../layout/service-map/arrows';
import { ServiceMapPlacementStrategy } from '../layout/service-map/placement';
import { useMutationObserver } from './hooks/useMutationObserver';

export interface MapElementsProps {
  namespace?: string;
  namespaceBBox?: { x: number; y: number; w: number; h: number } | null;
  placement: ServiceMapPlacementStrategy;
  arrows: ServiceMapArrowStrategy;
  cards: ServiceCard[];
  cardRenderer: (props: { card: ServiceCard; collector: RefsCollector; isUnsizedMode: boolean }) => React.ReactNode;
  collector: RefsCollector;
  onCardMutated?: () => void;
}

export const MapElements: React.FC<MapElementsProps> = observer((props) => {
  const {
    namespace,
    namespaceBBox,
    arrows,
    cards,
    cardRenderer,
    collector,
    onCardMutated,
  } = props;

  const cardsRef = React.useRef<SVGGElement | null>(null);

  // NOTE: We use only one mutation observer to watch over cards changes and
  // react on that with arrows rebuilding in the end
  useMutationObserver({ ref: cardsRef, options: { all: true } }, () => {
    collector.cardsMutationsObserved();
    onCardMutated?.();
  });

  const renderedCards = cards.map((card) =>
    cardRenderer({ card, collector, isUnsizedMode: false })
  );

  return (
    <g className="map-elements">
      {namespaceBBox && (
        <NamespaceBoundary
          namespace={namespace || 'default'}
          x={namespaceBBox.x}
          y={namespaceBBox.y}
          width={namespaceBBox.w}
          height={namespaceBBox.h}
        />
      )}

      <g className="arrows">
        <g className="bodies">
          {Array.from(arrows.arrows.values()).map((arrow) => (
            <ServiceMapArrowBody key={arrow.id} arrow={arrow} />
          ))}
        </g>
        <g className="duck-feets">
          {Array.from(arrows.combinedAccessPointArrowsMap, ([connectorId, accessPointArrows]) => (
            <ServiceMapArrowDuckFeet
              key={connectorId}
              connectorId={connectorId}
              arrows={accessPointArrows}
            />
          ))}
        </g>
      </g>

      <g ref={cardsRef} className="visible-cards">{renderedCards}</g>
    </g>
  );
});