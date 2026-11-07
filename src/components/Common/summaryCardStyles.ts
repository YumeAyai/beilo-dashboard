import type { SxProps, Theme } from '@mui/material/styles';

export const summaryCardSx: SxProps<Theme> = {
  borderRadius: 2,
  width: '100%',
  minHeight: 150,
};

export const summaryCardContentSx: SxProps<Theme> = {
  p: 2,
  '&:last-child': { pb: 2 },
};

export const summaryMetricsSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(140px, 1fr))' },
  gap: { xs: 1.5, sm: 2 },
};
