import { Box } from '@mui/material';

export type ConnectionState = 'receiving' | 'reconnecting' | 'stopped' | 'idle';
interface ConnectionIndicatorProps {
  state: ConnectionState;
  flowsPerSec?: number;
  nodesConnected?: number;
  totalNodes?: number;
  reconnectDelaySec?: number;
  isDark?: boolean;
  flowsDiffCount?: number;
}

// Same factor boundaries and one decimal place as Hubble's generateStatusLabel.
function formatHubbleFlowRate(fps: number): string {
  const [factor, suffix] = fps < 1e3 ? [1, ''] : fps < 1e6 ? [1e3, 'K'] : [1e6, 'M'];
  return `${(fps / factor).toFixed(1)}${suffix} flows/s`;
}

export function ConnectionIndicator({ state, flowsPerSec, nodesConnected, totalNodes, reconnectDelaySec, isDark = false }: ConnectionIndicatorProps) {
  const ready = flowsPerSec !== undefined && nodesConnected !== undefined && totalNodes !== undefined;
  const active = state === 'receiving' || state === 'reconnecting';
  const color = state === 'receiving' ? '#71bd25' : state === 'idle' ? '#c7c7c7' : '#bd6225';
  const label = state === 'receiving' ? 'Receiving' : state === 'reconnecting'
    ? reconnectDelaySec === undefined ? 'Reconnecting' : `Reconnecting in ${reconnectDelaySec.toFixed(1)}s`
    : state === 'stopped' ? 'Data receiving stopped' : 'Idle';
  return <Box data-testid="hubble-connection-indicator" sx={{ display: 'flex', alignItems: 'center', flexShrink: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    fontSize: 14, lineHeight: 1.28581, fontWeight: 500, whiteSpace: 'nowrap', color: isDark ? '#a8b5bf' : '#5c7080' }}>
    <Box sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: '50%', bgcolor: color,
      animation: active ? 'hubble-status-circle 1.4s infinite both' : 'none',
      '@keyframes hubble-status-circle': { '0%, 100%': { opacity: 0.75 }, '20%': { opacity: 1 } } }} />
    <Box sx={{ ml: '7px' }}>
      {state === 'receiving' && ready ? <>
        <span title={`${flowsPerSec.toFixed(1)} flows/s`}>{formatHubbleFlowRate(flowsPerSec)}</span>
        <Box component="span" sx={{ mx: '8px' }}>•</Box>
        <span>{nodesConnected}/{totalNodes} nodes</span>
      </> : <Box component="span" sx={{ color: '#7c8389' }}>{label}{active ? '…' : ''}</Box>}
    </Box>
  </Box>;
}
