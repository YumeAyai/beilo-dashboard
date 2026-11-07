import { useTheme } from '@mui/material';
import React, { memo } from 'react';

interface NamespaceBoundaryProps {
  namespace: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const NamespaceBoundary: React.FC<NamespaceBoundaryProps> = memo(({
  namespace,
  x,
  y,
  width,
  height,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const borderColor = isDark ? '#5a5a7a' : '#9ba1a8';
  const fillColor = isDark ? '#1E1E2E' : '#ebeef0';

  return (
    <g>
      {/* Dashed boundary rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={2}
        strokeDasharray="10,10"
        rx={10}
        ry={10}
      />

      {/* Namespace label text inside the rectangle */}
      <text
        x={x + 50}
        y={y + 64}
        fontSize={28}
        fontWeight={700}
        fill={isDark ? '#a0a0c0' : '#58626d'}
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' }}
      >
        {namespace}
      </text>
    </g>
  );
});

NamespaceBoundary.displayName = 'NamespaceBoundary';
