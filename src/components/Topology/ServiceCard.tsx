import React, { memo } from 'react';
import { getTrafficColor } from '../ServiceMap/colors';
import { CARD_WIDTH, CARD_HEIGHT, type ServiceCardData } from '../ServiceMap/service-map/types';
import { CardHeader } from './CardHeader';
import { AccessPointRow } from './AccessPointRow';
import { CardLabels } from './CardLabels';
import { HttpEndpointGroup } from './HttpEndpointGroup';

interface ServiceCardProps {
  data: ServiceCardData;
  x: number;
  y: number;
  width?: number;
  height?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: (data: ServiceCardData) => void;
  isDark?: boolean;
  cardRef?: (el: SVGGElement | null) => void;
}

const DEFAULT_WIDTH = CARD_WIDTH;
const DEFAULT_HEIGHT = CARD_HEIGHT;

export const ServiceCard: React.FC<ServiceCardProps> = memo(({
  data,
  x,
  y,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  selected = false,
  dimmed = false,
  onClick,
  isDark = false,
  cardRef,
}) => {
  const borderColor = selected ? '#3B82F6' : dimmed ? (isDark ? '#2a2a4a' : '#d0d0d0') : isDark ? '#3a3a5c' : '#e0e0e0';
  const bgColor = isDark ? '#1E1E2E' : '#FFFFFF';
  const headerBgColor = isDark ? '#252536' : '#F8F9FA';
  const opacity = dimmed ? 0.4 : 1;

  const handleClick = () => onClick?.(data);

  const trafficColor = getTrafficColor(
    data.errorRate || 0,
    data.requestRate || 0,
    { primary: '#3B82F6', error: '#EF4444', warning: '#F59E0B', success: '#10B981', textSecondary: '#9CA3AF', border: borderColor, cardBg: bgColor, headerBg: headerBgColor, sectionBg: '#2A2A3E' }
  );

  return (
    <g transform={`translate(${x}, ${y})`} onClick={handleClick} style={{ cursor: 'pointer' }} opacity={opacity} ref={cardRef}>
      {/* Card shadow */}
      <rect x={3} y={3} width={width} height={height} rx={12} ry={12} fill="rgba(0,0,0,0.15)" />

      {/* Card background */}
      <rect width={width} height={height} rx={12} ry={12} fill={bgColor} stroke={borderColor} strokeWidth={selected ? 2.5 : 1} />

      {/* Header background */}
      <rect width={width} height={52} rx={12} ry={12} fill={headerBgColor} />
      <rect x={0} y={42} width={width} height={10} fill={headerBgColor} />

      {/* Header content */}
      <CardHeader data={data} width={width} isDark={isDark} borderColor={borderColor} />

      {/* Access Point Row */}
      <AccessPointRow data={data} width={width} isDark={isDark} />

      {/* Divider */}
      <line x1={8} y1={104} x2={width - 8} y2={104} stroke={borderColor} strokeWidth={1} strokeDasharray="2,2" />

      {/* Labels Section */}
      <CardLabels labels={data.labels} width={width} isDark={isDark} />

      {/* L7 HTTP Endpoints (shown only when card is selected) */}
      {selected && data.l7Endpoints && data.l7Endpoints.length > 0 && (
        <>
          <line x1={8} y1={126} x2={width - 8} y2={126} stroke={borderColor} strokeWidth={0.5} strokeDasharray="2,2" />
          <text x={12} y={138} fontSize={9} fontWeight={600} fill={isDark ? '#9CA3AF' : '#6B7280'}>
            HTTP Endpoints
          </text>
          <HttpEndpointGroup
            endpoints={data.l7Endpoints}
            maxVisible={5}
            x={0}
            y={142}
            width={width}
            isDark={isDark}
          />
        </>
      )}

      {/* Bottom traffic bar */}
      <rect
        x={0}
        y={height - 5}
        width={Math.min((data.requestRate || 0) * 5, width)}
        height={5}
        fill={trafficColor}
      />

      {/* Pods count indicator */}
      {data.pods !== undefined && data.pods > 0 && (
        <>
          <circle
            cx={width - 16}
            cy={height - 14}
            r={8}
            fill={isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)'}
          />
          <text
            x={width - 16}
            y={height - 10}
            fontSize={10}
            fontWeight={600}
            fill={isDark ? '#A5B4FC' : '#6366F1'}
            textAnchor="middle"
          >
            {data.pods}
          </text>
        </>
      )}
    </g>
  );
});

ServiceCard.displayName = 'ServiceCard';

export { CARD_WIDTH, CARD_HEIGHT };
export type { ServiceCardData };
