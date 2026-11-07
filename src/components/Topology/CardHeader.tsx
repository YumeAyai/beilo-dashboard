import { HubbleIcon } from './HubbleIcon';
import { Box } from '@mui/material';
import { memo } from 'react';
import { getTrafficLabel } from '../ServiceMap/colors';
import type { ServiceCardData } from '../ServiceMap/service-map/types';
import { EndpointLogo } from './EndpointLogo';

interface CardHeaderProps {
  data: ServiceCardData;
  width: number;
  isDark: boolean;
  borderColor: string;
}

export const CardHeader = memo(function CardHeader({
  data,
  width,
  isDark,
}: CardHeaderProps) {
  const isWorld = data.isWorld || data.type === 'world';
  const isHost = data.isHost || data.type === 'host';
  const trafficLabel = getTrafficLabel(data.trafficDirection);

  const displayLabel =
    (isWorld || isHost) && data.domain ? data.domain : data.label;

  return (
    <>
      {/* Header divider line */}
      <line x1={0} y1={52} x2={width} y2={52} stroke={isDark ? '#3a3a5c' : '#e0e0e0'} strokeWidth={1} />

      {/* Icon with colored circle background */}
      <EndpointLogo data={data} size={28} />

      {/* Service name */}
      <text x={46} y={24} fontSize={14} fontWeight={600} fill={isDark ? '#E2E8F0' : '#1E293B'}>
        {displayLabel.length > 20 ? displayLabel.slice(0, 20) + '...' : displayLabel}
      </text>

      {/* Namespace badge */}
      <rect
        x={46}
        y={30}
        width={data.namespace.length * 6 + 12}
        height={16}
        rx={4}
        ry={4}
        fill={isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)'}
      />
      <text x={52} y={42} fontSize={10} fill={isDark ? '#A5B4FC' : '#6366F1'}>
        {data.namespace}
      </text>

      {/* Traffic direction indicator */}
      {trafficLabel && (
        <foreignObject x={width - 110} y={18} width={90} height={20}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontSize: 10, color: '#10B981', fontWeight: 500 }}>
              {trafficLabel}
            </Box>
            <HubbleIcon name="arrow-right" sx={{ fontSize: 12, color: '#10B981' }} />
          </Box>
        </foreignObject>
      )}
    </>
  );
});
