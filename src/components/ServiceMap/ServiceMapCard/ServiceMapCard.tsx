import { Box, Typography } from '@mui/material';
import { type FunctionComponent, memo } from 'react';
import { Card } from '../Card';
import { RefsCollector } from '../collector';
import { ServiceCard } from '../domain/card';
import { EndpointCardHeader } from '../EndpointCardHeader';
import { XYWH } from '../geometry';
import { CARD_HEIGHT, CARD_WIDTH } from '../service-map/types';
import { EndpointCardLabels } from './EndpointCardLabels';
import { HttpEndpoint } from './HttpEndpoint';

interface HttpEndpointData {
  method: string;
  pathname: string;
  count?: number;
}

interface ServiceMapCardProps {
  card: ServiceCard;
  collector: RefsCollector;
  isUnsizedMode?: boolean;
  active?: boolean;
  currentNamespace?: string;
  className?: string;
  onHeaderClick?: (card: ServiceCard) => void;
  l7endpoints?: HttpEndpointData[];
  maxHttpEndpointsVisible?: number;
}

export const ServiceMapCard: FunctionComponent<ServiceMapCardProps> = memo(function ServiceMapCard(
  props,
) {
  const {
    card,
    collector,
    isUnsizedMode = false,
    active = false,
    onHeaderClick,
    l7endpoints = [],
    maxHttpEndpointsVisible = Infinity,
  } = props;

  const cardRef = collector.cardRoot(card.id);
  const coords = XYWH.fromArgs(0, 0, CARD_WIDTH, CARD_HEIGHT);

  return (
    <Card
      card={card}
      coords={coords}
      className={`service-map-card ${active ? 'active' : ''}`}
      isUnsizedMode={isUnsizedMode}
      divRef={cardRef}
      onClick={() => {}}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          borderRadius: '10px',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s ease-in-out',
          ...(active ? { boxShadow: 4 } : {}),
        }}
      >
        {/* Card Header */}
        <EndpointCardHeader
          card={card}
          currentNamespace={props.currentNamespace}
          onHeadlineClick={() => onHeaderClick?.(card)}
        />

        {/* Access Points */}
        {card.accessPoints.size > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              mx: 2,
              my: 1,
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
            }}
          >
            {Array.from(card.accessPoints.values()).map((ap) => (
              <Box key={ap.port} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="img" src={`${import.meta.env.BASE_URL}hubble/icons/misc/access-point.svg`} alt="" aria-hidden="true" sx={{ width: 16, height: 16, flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  {ap.port}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  {ap.protocol}
                </Typography>
                {ap.l7Protocol && (
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: 'primary.main',
                    }}
                  >
                    /{ap.l7Protocol}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Labels - shown when active */}
        {active && card.labels.length > 0 && (
          <EndpointCardLabels labels={card.labels} />
        )}

        {/* HTTP Endpoints - shown when active */}
        {active && l7endpoints.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            {l7endpoints.slice(0, maxHttpEndpointsVisible).map((ep, idx) => (
              <HttpEndpoint key={idx} endpoint={ep} />
            ))}
            {l7endpoints.length > maxHttpEndpointsVisible && (
              <Typography
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.75rem',
                  color: 'text.disabled',
                  textAlign: 'center',
                }}
              >
                {l7endpoints.length - maxHttpEndpointsVisible} more endpoints hidden
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
});