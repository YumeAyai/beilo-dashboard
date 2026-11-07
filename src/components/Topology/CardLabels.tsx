import { memo } from 'react';
import { Box, Chip } from '@mui/material';
import type { Label } from '../ServiceMap/service-map/types';

interface CardLabelsProps {
  labels?: Label[];
  width: number;
  isDark: boolean;
}

export const CardLabels = memo(function CardLabels({
  labels,
  width,
  isDark,
}: CardLabelsProps) {
  if (!labels || labels.length === 0) {
    return (
      <text x={8} y={130} fontSize={10} fill="#9CA3AF">
        No labels
      </text>
    );
  }

  return (
    <foreignObject x={8} y={110} width={width - 16} height={60}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {labels.slice(0, 4).map((label, idx) => (
          <Chip
            key={idx}
            label={label.value || label.key}
            size="small"
            sx={{
              height: 20,
              fontSize: 9,
              fontWeight: 500,
              bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              color: isDark ? '#A5B4FC' : '#6366F1',
              borderRadius: '4px',
              '& .MuiChip-label': { px: 1 },
            }}
          />
        ))}
      </Box>
    </foreignObject>
  );
});
