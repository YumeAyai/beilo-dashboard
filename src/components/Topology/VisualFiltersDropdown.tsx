import { HubbleIcon } from './HubbleIcon';
import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Popover,
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
} from '@mui/material';

interface VisualFiltersDropdownProps {
  showHost: boolean;
  onShowHostToggle: () => void;
  showKubeDns: boolean;
  onShowKubeDnsToggle: () => void;
  showRemoteNode: boolean;
  onShowRemoteNodeToggle: () => void;
  showPrometheusApp: boolean;
  onShowPrometheusAppToggle: () => void;
}

export function VisualFiltersDropdown({
  showHost,
  onShowHostToggle,
  showKubeDns,
  onShowKubeDnsToggle,
  showRemoteNode,
  onShowRemoteNodeToggle,
  showPrometheusApp,
  onShowPrometheusAppToggle,
}: VisualFiltersDropdownProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setAnchorEl(anchorRef.current);
    }
  }, [open]);

  const anyDisabled = !showHost || !showKubeDns || !showRemoteNode || !showPrometheusApp;

  return (
    <>
      <IconButton
        ref={anchorRef}
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          borderRadius: '4px',
          color: anyDisabled ? 'warning.main' : 'text.secondary',
        }}
      >
        <HubbleIcon name="visual-filters" fontSize="small" />
      </IconButton>
      <Typography variant="caption" sx={{ fontSize: 12, color: 'text.secondary', mr: 1 }}>
        Visual
      </Typography>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, minWidth: 200 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!showHost}
                onChange={onShowHostToggle}
                size="small"
              />
            }
            label={<Typography variant="body2">Hide host service</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!showKubeDns}
                onChange={onShowKubeDnsToggle}
                size="small"
              />
            }
            label={<Typography variant="body2">Hide kube-dns:53 pod</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!showRemoteNode}
                onChange={onShowRemoteNodeToggle}
                size="small"
              />
            }
            label={<Typography variant="body2">Hide remote node</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!showPrometheusApp}
                onChange={onShowPrometheusAppToggle}
                size="small"
              />
            }
            label={<Typography variant="body2">Hide prometheus app</Typography>}
          />
        </Box>
      </Popover>
    </>
  );
}
