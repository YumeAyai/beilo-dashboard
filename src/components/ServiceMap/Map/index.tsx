import { Box } from '@mui/material';
import { observer } from 'mobx-react';
import React from 'react';

import { RefsCollector } from '../collector';
import { ServiceCard } from '../domain/card';
import { ServiceMapArrowStrategy } from '../layout/service-map/arrows';
import { ServiceMapPlacementStrategy } from '../layout/service-map/placement';
import { useMapZoom } from './hooks/useMapZoom';
import { MapElements } from './MapElements';

export interface MapProps {
  namespace?: string;
  namespaceBBox?: { x: number; y: number; w: number; h: number } | null;
  placement: ServiceMapPlacementStrategy;
  arrows: ServiceMapArrowStrategy;
  cards: ServiceCard[];
  cardRenderer: (props: { card: ServiceCard; collector: RefsCollector; isUnsizedMode: boolean }) => React.ReactNode;
  visibleHeight?: number;
  wasDragged?: boolean;
  onMapDrag?: (dragged: boolean) => void;
  onCardMutated?: () => void;
}

export const Map: React.FC<MapProps> = observer((props) => {
  const {
    namespace,
    placement,
    arrows,
    cards,
    cardRenderer,
    onMapDrag,
    onCardMutated,
  } = props;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const collector = React.useMemo(() => new RefsCollector(), []);

  const { ref: svgRef, transform } = useMapZoom({
    onMapDrag,
  });

  React.useEffect(() => {
    if (cards.length > 0 && containerRef.current) {
      placement.setCards(cards);
    }
  }, [cards, placement]);

  React.useEffect(() => {
    collector.onCoordsUpdated((coords) => {
      placement.setCardHeights(coords.cards, 0.5);
      arrows.rebuild();
    });
    return () => collector.clear();
  }, [collector, placement, arrows]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'grab',
        }}
        onDoubleClick={(e) => e.preventDefault()}
      >
        <g transform={transform}>
          <MapElements
            namespace={namespace}
            namespaceBBox={props.namespaceBBox}
            placement={placement}
            arrows={arrows}
            cards={cards}
            cardRenderer={cardRenderer}
            collector={collector}
            onCardMutated={onCardMutated}
          />
        </g>
      </svg>
    </Box>
  );
});