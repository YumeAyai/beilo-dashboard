import { memo } from 'react';

interface HttpEndpointData {
  method: string;
  url: string;
}

interface HttpEndpointGroupProps {
  endpoints: HttpEndpointData[];
  maxVisible?: number;
  x: number;
  y: number;
  width: number;
  isDark?: boolean;
}

export const HttpEndpointGroup = memo(function HttpEndpointGroup({
  endpoints,
  maxVisible = 5,
  x,
  y,
  width,
  isDark = false,
}: HttpEndpointGroupProps) {
  const visible = endpoints.slice(0, maxVisible);
  const hidden = endpoints.length - maxVisible;
  const maxUrlCharacters = Math.max(0, Math.floor((width - 48) / 6));

  const methodColors: Record<string, string> = {
    GET: '#10B981',
    POST: '#3B82F6',
    PUT: '#F59E0B',
    PATCH: '#8B5CF6',
    DELETE: '#EF4444',
    HEAD: '#6B7280',
    OPTIONS: '#6B7280',
  };

  return (
    <g>
      {visible.map((ep, i) => {
        const ey = y + i * 18;
        const method = ep.method || 'GET';
        const color = methodColors[method] || '#6B7280';

        return (
          <g key={`${ep.method}-${ep.url}-${i}`}>
            <rect x={x + 4} y={ey} width={36} height={14} rx={3} fill={isDark ? `${color}33` : `${color}1A`} />
            <text x={x + 8} y={ey + 11} fontSize={9} fontWeight={600} fill={color}>
              {method}
            </text>
            <text
              x={x + 44}
              y={ey + 11}
              fontSize={9}
              fill={isDark ? '#9CA3AF' : '#6B7280'}
            >
              {ep.url.length > maxUrlCharacters ? ep.url.slice(0, Math.max(0, maxUrlCharacters - 2)) + '..' : ep.url}
            </text>
          </g>
        );
      })}
      {hidden > 0 && (
        <text
          x={x + 8}
          y={y + maxVisible * 18 + 2}
          fontSize={9}
          fill={isDark ? '#6B7280' : '#9CA3AF'}
          fontStyle="italic"
        >
          ...{hidden} more endpoint{hidden > 1 ? 's' : ''}
        </text>
      )}
    </g>
  );
});
