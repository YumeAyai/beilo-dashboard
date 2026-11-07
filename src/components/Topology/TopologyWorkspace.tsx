import { Box } from '@mui/material';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface TopologyWorkspaceProps {
  canvas: ReactNode;
  children: ReactNode;
}

// The flow panel overlays the map, as in Hubble. Resizing it must not resize
// the SVG viewport or rerender its cards and recompute their geometry.
export function TopologyWorkspace({ canvas, children }: TopologyWorkspaceProps) {
  const { t } = useTranslation();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; height: number; pointerId: number } | null>(null);
  const [height, setHeight] = useState(200);
  const [dragging, setDragging] = useState(false);

  return (
    <Box
      ref={workspaceRef}
      data-testid="topology-workspace"
      style={{ '--topology-panel-height': `${height}px` } as CSSProperties}
      sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}
    >
      {canvas}
      <Box
        data-topology-panel
        data-testid="topology-flow-panel"
        sx={{
          position: 'absolute', bottom: 0, left: 16, right: 16,
          height: 'min(var(--topology-panel-height), 75%)',
          display: 'flex', flexDirection: 'column', zIndex: 20,
          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
          borderRadius: '8px 8px 0 0', overflow: 'hidden',
          userSelect: dragging ? 'none' : 'auto',
        }}
      >
        <Box
          role="separator"
          aria-label={t('topology.flows')}
          aria-orientation="horizontal"
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { y: event.clientY, height: event.currentTarget.parentElement!.getBoundingClientRect().height, pointerId: event.pointerId };
            setDragging(true);
          }}
          onPointerMove={event => {
            const start = drag.current;
            if (!start || event.pointerId !== start.pointerId) return;
            const max = Math.min(600, (workspaceRef.current?.clientHeight || window.innerHeight) * 0.75);
            setHeight(Math.max(Math.min(150, max), Math.min(max, start.height + start.y - event.clientY)));
          }}
          onPointerUp={() => { drag.current = null; setDragging(false); }}
          onPointerCancel={() => { drag.current = null; setDragging(false); }}
          onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
          sx={{
            height: 8, flexShrink: 0, cursor: 'ns-resize', touchAction: 'none',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        />
        {children}
      </Box>
    </Box>
  );
}
