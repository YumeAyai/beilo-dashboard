import { memo } from 'react';
import type { ServiceCardData } from '../ServiceMap/service-map/types';

interface AccessPointRowProps {
  data: ServiceCardData;
  width: number;
  isDark: boolean;
}

export const AccessPointRow = memo(function AccessPointRow({
  data,
  width,
  isDark,
}: AccessPointRowProps) {
  const ports = data.ports || [80];
  const primaryPort = ports[0] || 80;

  return (
    <>
      {/* Port Info Section */}
      <rect
        x={8}
        y={60}
        width={width - 16}
        height={36}
        rx={8}
        ry={8}
        fill={isDark ? '#2A2A3E' : '#F0F1F4'}
      />

      {/* Access Point Icon with Arrow */}
      <image x={18} y={70} width={16} height={16} href={`${import.meta.env.BASE_URL}hubble/icons/misc/access-point.svg`} aria-hidden="true" />

      {/* Port number */}
      <text x={45} y={82} fontSize={12} fontWeight={600} fill={isDark ? '#E2E8F0' : '#374151'}>
        {primaryPort}
      </text>

      {/* Dot separator */}
      <circle cx={80} cy={78} r={2} fill="#9CA3AF" />

      {/* Protocol label */}
      <text x={90} y={82} fontSize={10} fill="#9CA3AF">
        TCP
      </text>

      {/* Additional ports indicator */}
      {ports.length > 1 && (
        <text x={width - 20} y={82} fontSize={10} fill="#9CA3AF" textAnchor="end">
          +{ports.length - 1}
        </text>
      )}
    </>
  );
});
