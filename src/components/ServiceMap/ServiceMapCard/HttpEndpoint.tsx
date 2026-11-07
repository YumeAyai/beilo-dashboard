import { Box, Typography } from '@mui/material';
import { type FunctionComponent, memo } from 'react';

interface HttpEndpointData {
  method: string;
  pathname: string;
  count?: number;
}

interface HttpEndpointProps {
  endpoint: HttpEndpointData;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#10B981',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#8B5CF6',
  DELETE: '#EF4444',
  HEAD: '#6B7280',
  OPTIONS: '#EC4899',
};

export const HttpEndpoint: FunctionComponent<HttpEndpointProps> = memo(function HttpEndpoint({
  endpoint,
}) {
  const color = METHOD_COLORS[endpoint.method] || '#6B7280';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        py: 1,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      {/* URL Path header */}
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '0.8rem',
          fontFamily: '"Roboto Mono", monospace',
          color: 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {endpoint.pathname}
      </Typography>

      {/* Method connector row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Circle indicator */}
        <Box
          sx={{
            width: 15,
            height: 15,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: color,
            backgroundColor: `${color}40`,
            flexShrink: 0,
          }}
        />

        {/* Method label */}
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: color,
            textTransform: 'uppercase',
            fontFamily: '"Roboto Mono", monospace',
          }}
        >
          {endpoint.method}
        </Typography>

        {/* Count badge */}
        {endpoint.count && endpoint.count > 1 && (
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: 'text.disabled',
            }}
          >
            ×{endpoint.count}
          </Typography>
        )}
      </Box>
    </Box>
  );
});