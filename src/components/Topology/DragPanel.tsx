import { HubbleIcon } from './HubbleIcon';
import { Box, Checkbox, FormControlLabel, IconButton, Popover, Typography } from '@mui/material';
import { useDrag } from '@use-gesture/react';
import { useCallback, useState } from 'react';

const ALL_COLUMNS = [
  { key: 'sourcePod', label: 'Source Pod', default: true },
  { key: 'sourceIP', label: 'Source IP', default: false },
  { key: 'sourceIdentity', label: 'Source Service', default: true },
  { key: 'destinationPod', label: 'Dest Pod', default: true },
  { key: 'destinationIP', label: 'Dest IP', default: false },
  { key: 'destinationIdentity', label: 'Dest Service', default: true },
  { key: 'destinationPort', label: 'Port', default: true },
  { key: 'l7info', label: 'L7 Info', default: true },
  { key: 'trafficDirection', label: 'Direction', default: true },
  { key: 'verdict', label: 'Verdict', default: true },
  { key: 'authentication', label: 'Auth', default: false },
  { key: 'tcpFlags', label: 'TCP Flags', default: true },
  { key: 'timestamp', label: 'Timestamp', default: true },
];

interface DragPanelProps {
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onResize?: (dy: number) => void;
  onStreamStop?: () => void;
}

export function DragPanel({ visibleColumns, onToggleColumn, onResize, onStreamStop }: DragPanelProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);
  const handleClose = useCallback(() => setAnchorEl(null), []);

  // Drag gesture for resizing
  const bind = useDrag(({ delta, first }) => {
    if (first) onStreamStop?.();
    if (onResize && delta[1] !== 0) {
      onResize(delta[1]);
    }
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* Drag handle */}
      <Box
        {...bind()}
        sx={{
          width: 4,
          height: 16,
          borderRadius: 1,
          bgcolor: 'action.hover',
          cursor: 'ns-resize',
          '&:hover': {
            bgcolor: 'primary.main',
          },
        }}
      />

      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{ borderRadius: '4px' }}
      >
        <HubbleIcon name="properties" fontSize="small" />
      </IconButton>
      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
        Columns
      </Typography>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, minWidth: 160 }}>
          {ALL_COLUMNS.map(col => (
            <FormControlLabel
              key={col.key}
              control={
                <Checkbox
                  checked={visibleColumns.has(col.key)}
                  onChange={() => onToggleColumn(col.key)}
                  size="small"
                />
              }
              label={<Typography variant="body2">{col.label}</Typography>}
            />
          ))}
        </Box>
      </Popover>
    </Box>
  );
}

export { ALL_COLUMNS };
