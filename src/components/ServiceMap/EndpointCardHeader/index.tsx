import { Box, Typography } from '@mui/material';
import { memo } from 'react';
import { ServiceCard } from '../domain/card';
import { EndpointLogo } from './EndpointLogo';

interface EndpointCardHeaderProps {
  card: ServiceCard;
  currentNamespace?: string | null;
  onHeadlineClick?: () => void;
}

export const EndpointCardHeader = memo(function EndpointCardHeader({
  card,
  currentNamespace,
  onHeadlineClick,
}: EndpointCardHeaderProps) {
  const showNamespace = !!card.namespace && card.namespace !== currentNamespace;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{ cursor: onHeadlineClick ? 'pointer' : 'default' }}
        onClick={onHeadlineClick}
      >
        <EndpointLogo card={card} size={40} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '0.95rem',
            color: 'text.primary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            ...(showNamespace ? {} : { lineHeight: 1.4 }),
          }}
        >
          {card.caption}
        </Typography>

        {showNamespace && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            {card.namespace}
          </Typography>
        )}
      </Box>
    </Box>
  );
});