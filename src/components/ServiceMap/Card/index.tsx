import { Box } from '@mui/material';
import { XYWH } from '../geometry';
import type { CardProps, SVGGElementRef } from './general';

export type { CardProps, SVGGElementRef };

interface CardComponentProps<C> extends CardProps<C> {
  onHeaderClick?: (c: C) => void;
}

export function Card<C>(props: CardComponentProps<C>) {
  const { card, coords, children, className, isUnsizedMode, onClick, divRef } = props;

  const shadowSize = 24;
  const { x, y, w, h } = coords ?? XYWH.empty();

  // Detect active state from className
  const isActive = className?.includes('active') ?? false;

  const viewX = x - shadowSize;
  const viewY = y - shadowSize;
  const viewW = w + 2 * shadowSize;
  const viewH = h + 2 * shadowSize;

  const styles = {
    height: isUnsizedMode ? 'auto' : `${h}px`,
  };

  return (
    <g
      transform={`translate(${viewX}, ${viewY})`}
      onClick={() => onClick?.(card)}
      style={{ cursor: 'pointer' }}
    >
      <foreignObject width={viewW} height={viewH} style={{ overflow: isUnsizedMode ? 'visible' : 'hidden' }}>
        <Box
          ref={divRef}
          sx={{
            margin: `${shadowSize}px`,
            borderRadius: '10px',
            userSelect: 'none',
            height: isUnsizedMode ? 'auto' : `${h}px`,
            position: 'relative',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
            lineHeight: 1.28581,
            '& .MuiTypography-root': { fontFamily: 'inherit' },
            backgroundColor: 'rgba(251,251,251,0.85)',
            '&::after': { content: '""', position: 'absolute', inset: 0, border: '2px solid #acb1b8', borderRadius: '10px', pointerEvents: 'none' },
            boxShadow: isActive ? 4 : 'none',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
            '&:hover': { boxShadow: isActive ? 4 : 'none' },
          }}
          className={className}
          style={styles}
        >
          {children}
        </Box>
      </foreignObject>
    </g>
  );
}