import { HubbleIcon } from './HubbleIcon';
import {
  Box,
  Divider,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import React, { memo, useCallback } from 'react';
import { colors } from '../../theme/colors';
import type { FlowData } from './FlowsTable';
import { isFlowFilterSelected, type FlowFilter, type FlowFilterDirection, type FlowFilterKind } from './flowFilters';
import {
  DnsEntry,
  IdentityEntry,
  IPEntry,
  LabelsEntry,
  PodEntry,
  TCPFlagsEntry,
  VerdictEntry,
} from './SidebarComponents';

export type FilterDirection = 'from' | 'to';

interface FlowDetailsPanelProps {
  flow: FlowData | null;
  onClose?: () => void;
  onFilterByIdentity?: (identity: string, direction?: FilterDirection) => void;
  onFilterByDNS?: (dns: string) => void;
  onFilterByTCPFlag?: (flag: string, direction?: FilterDirection) => void;
  onFilterByLabel?: (label: string, direction?: FilterDirection) => void;
  onFilterByPod?: (podName: string, namespace?: string, direction?: FilterDirection) => void;
  onFilterByIP?: (ip: string, direction?: FilterDirection) => void;
  onFilterByVerdict?: (verdict: string) => void;
  flowFilters?: FlowFilter[];
  filters?: {
    verdicts?: Set<string>;
    tcpFlags?: Map<string, FilterDirection>;
    labels?: Map<string, FilterDirection>;
    pods?: Map<string, FilterDirection>;
    identities?: Map<string, FilterDirection>;
    ips?: Map<string, FilterDirection>;
    dns?: Set<string>;
  };
}

const getDirectionColor = (direction: string) => {
  switch (direction?.toLowerCase()) {
    case 'ingress':
      return colors.primary.light;
    case 'egress':
      return colors.warning.light;
    default:
      return colors.text.secondary;
  }
};

export const FlowDetailsPanel: React.FC<FlowDetailsPanelProps> = memo(({
  flow,
  onClose,
  onFilterByIdentity,
  onFilterByDNS,
  onFilterByTCPFlag,
  onFilterByLabel,
  onFilterByPod,
  onFilterByIP,
  onFilterByVerdict,
  filters,
  flowFilters,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const tcpFilterDirection: FilterDirection = 'from';

  // Selection belongs to the filter model. Derive it during render so a new
  // flow or changed direction cannot show stale state for one commit.
  const isSelectedFilter = useCallback((kind: FlowFilterKind, query: string, direction: FlowFilterDirection, legacy = false) =>
    flowFilters ? isFlowFilterSelected(flowFilters, kind, query, direction) : legacy, [flowFilters]);
  const sourceLabelsSelection = new Set((flow?.sourceLabels ?? []).filter(label => isSelectedFilter('label', label, 'from', filters?.labels?.get(label) === 'from')));
  const destLabelsSelection = new Set((flow?.destinationLabels ?? []).filter(label => isSelectedFilter('label', label, 'to', filters?.labels?.get(label) === 'to')));
  const tcpFlagSelection = new Set((flow?.tcpFlags?.toLowerCase().split(',').map(flag => flag.trim()) ?? []).filter(flag => isSelectedFilter('tcp-flag', flag, 'from', filters?.tcpFlags?.get(flag) === 'from')));
  const dnsSelected = !!flow?.destinationDns && isSelectedFilter('dns', flow.destinationDns, 'either', !!filters?.dns?.has(flow.destinationDns));
  const podKey = (pod: string, namespace?: string) => namespace && namespace !== '-' ? `${namespace}/${pod}` : pod;

  const handleVerdictClick = useCallback(() => {
    if (!flow) return;
    const isSelected = filters?.verdicts?.has(flow.verdict);
    if (isSelected) {
      onFilterByVerdict?.('');
    } else {
      onFilterByVerdict?.(flow.verdict);
    }
  }, [flow, filters, onFilterByVerdict]);

  const handleSourceLabelClick = useCallback((label: string) => {
    if (!flow) return;
    const isSelected = isSelectedFilter('label', label, 'from', filters?.labels?.get(label) === 'from');
    if (isSelected) {
      onFilterByLabel?.('');
    } else {
      onFilterByLabel?.(label, 'from');
    }
  }, [flow, filters, isSelectedFilter, onFilterByLabel]);

  const handleDestLabelClick = useCallback((label: string) => {
    if (!flow) return;
    const isSelected = isSelectedFilter('label', label, 'to', filters?.labels?.get(label) === 'to');
    if (isSelected) {
      onFilterByLabel?.('');
    } else {
      onFilterByLabel?.(label, 'to');
    }
  }, [flow, filters, isSelectedFilter, onFilterByLabel]);

  const handleSourceIdentityClick = useCallback(() => {
    if (!flow || !flow.sourceIdentity) return;
    const isSelected = isSelectedFilter('identity', flow.sourceIdentity, 'from', filters?.identities?.get(flow.sourceIdentity) === 'from');
    if (isSelected) {
      onFilterByIdentity?.('');
    } else {
      onFilterByIdentity?.(flow.sourceIdentity, 'from');
    }
  }, [flow, filters, isSelectedFilter, onFilterByIdentity]);

  const handleDestIdentityClick = useCallback(() => {
    if (!flow || !flow.destinationIdentity) return;
    const isSelected = isSelectedFilter('identity', flow.destinationIdentity, 'to', filters?.identities?.get(flow.destinationIdentity) === 'to');
    if (isSelected) {
      onFilterByIdentity?.('');
    } else {
      onFilterByIdentity?.(flow.destinationIdentity, 'to');
    }
  }, [flow, filters, isSelectedFilter, onFilterByIdentity]);

  const handleSourceIPClick = useCallback(() => {
    if (!flow || !flow.sourceIP) return;
    const isSelected = isSelectedFilter('ip', flow.sourceIP, 'from', filters?.ips?.get(flow.sourceIP) === 'from');
    if (isSelected) {
      onFilterByIP?.('');
    } else {
      onFilterByIP?.(flow.sourceIP, 'from');
    }
  }, [flow, filters, isSelectedFilter, onFilterByIP]);

  const handleDestIPClick = useCallback(() => {
    if (!flow || !flow.destinationIP) return;
    const isSelected = isSelectedFilter('ip', flow.destinationIP, 'to', filters?.ips?.get(flow.destinationIP) === 'to');
    if (isSelected) {
      onFilterByIP?.('');
    } else {
      onFilterByIP?.(flow.destinationIP, 'to');
    }
  }, [flow, filters, isSelectedFilter, onFilterByIP]);

  const handleDnsClick = useCallback(() => {
    if (!flow || !flow.destinationDns) return;
    if (dnsSelected) {
      onFilterByDNS?.('');
    } else {
      onFilterByDNS?.(flow.destinationDns);
    }
  }, [flow, dnsSelected, onFilterByDNS]);

  const handleTcpFlagClick = useCallback((flag: string) => {
    if (!flow) return;
    const isSelected = isSelectedFilter('tcp-flag', flag, tcpFilterDirection, filters?.tcpFlags?.get(flag) === tcpFilterDirection);
    if (isSelected) {
      onFilterByTCPFlag?.('');
    } else {
      onFilterByTCPFlag?.(flag, tcpFilterDirection);
    }
  }, [flow, filters, isSelectedFilter, onFilterByTCPFlag]);

  const handleSourcePodClick = useCallback(() => {
    if (!flow || !flow.sourcePod) return;
    const key = podKey(flow.sourcePod, flow.sourceNamespace);
    const isSelected = isSelectedFilter('pod', key, 'from', filters?.pods?.get(key) === 'from');
    if (isSelected) {
      onFilterByPod?.('');
    } else {
      onFilterByPod?.(flow.sourcePod, flow.sourceNamespace, 'from');
    }
  }, [flow, filters, isSelectedFilter, onFilterByPod]);

  const handleDestPodClick = useCallback(() => {
    if (!flow || !flow.destinationPod) return;
    const key = podKey(flow.destinationPod, flow.destinationNamespace);
    const isSelected = isSelectedFilter('pod', key, 'to', filters?.pods?.get(key) === 'to');
    if (isSelected) {
      onFilterByPod?.('');
    } else {
      onFilterByPod?.(flow.destinationPod, flow.destinationNamespace, 'to');
    }
  }, [flow, filters, isSelectedFilter, onFilterByPod]);

  if (!flow) return null;

  // Parse TCP flags for display
  const parsedTcpFlags = flow.tcpFlags && flow.tcpFlags !== '-'
    ? flow.tcpFlags.toLowerCase().split(',').map(f => f.trim()).filter(Boolean)
    : [];

  // Parse labels for display
  const parsedSourceLabels = flow.sourceLabels || [];
  const parsedDestLabels = flow.destinationLabels || [];

  // Determine protocol
  const getProtocol = () => {
    if (flow.l7info) {
      if (flow.l7info.startsWith('DNS')) return 'DNS';
      if (flow.l7info.startsWith('Kafka')) return 'Kafka';
      if (flow.l7info.startsWith('HTTP')) return 'HTTP';
    }
    return 'TCP';
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 320,
        height: '100%',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDark ? colors.background.paperDark : colors.background.paper,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
          Flow Details
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose} sx={{ borderRadius: '4px' }}>
          <HubbleIcon name="cross" fontSize="small" />
        </IconButton>
      </Box>

      {/* Timestamp */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.secondary' }}>
          {flow.timestamp || '-'}
        </Typography>
      </Box>

      {/* Verdict */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Verdict
        </Typography>
        <VerdictEntry
          verdict={flow.verdict}
          isSelected={filters?.verdicts?.has(flow.verdict) || false}
          onClick={handleVerdictClick}
        />
      </Box>

      {/* Traffic direction */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Traffic direction
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: getDirectionColor(flow.trafficDirection),
          }}
        >
          {flow.trafficDirection}
        </Typography>
      </Box>

      {/* Cilium event type */}
      {flow.eventType && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Cilium event type
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.primary' }}>
            {flow.eventType}
          </Typography>
        </Box>
      )}

      {/* TCP Flags */}
      {parsedTcpFlags.length > 0 && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            TCP flags
          </Typography>
          <TCPFlagsEntry
            flags={parsedTcpFlags}
            selected={tcpFlagSelection}
            filterDirection={tcpFilterDirection}
            onClick={handleTcpFlagClick}
          />
        </Box>
      )}

      <Divider sx={{ mx: 2 }} />

      {/* Source */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Source
        </Typography>

        {/* Source Pod */}
        {flow.sourcePod && flow.sourcePod !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <PodEntry
              podName={flow.sourcePod}
              namespace={flow.sourceNamespace}
              isSelected={isSelectedFilter('pod', podKey(flow.sourcePod, flow.sourceNamespace), 'from', filters?.pods?.get(podKey(flow.sourcePod, flow.sourceNamespace)) === 'from')}
              onClick={handleSourcePodClick}
            />
          </Box>
        )}

        {/* Source Identity */}
        {flow.sourceIdentity && flow.sourceIdentity !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mr: 0.5 }}>
              Identity:
            </Typography>
            <IdentityEntry
              identity={flow.sourceIdentity}
              isSelected={isSelectedFilter('identity', flow.sourceIdentity, 'from', filters?.identities?.get(flow.sourceIdentity) === 'from')}
              onClick={handleSourceIdentityClick}
            />
          </Box>
        )}

        {/* Source IP */}
        {flow.sourceIP && flow.sourceIP !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mr: 0.5 }}>
              IP:
            </Typography>
            <IPEntry
              ip={flow.sourceIP}
              isSelected={isSelectedFilter('ip', flow.sourceIP, 'from', filters?.ips?.get(flow.sourceIP) === 'from')}
              onClick={handleSourceIPClick}
            />
          </Box>
        )}

        {/* Source Labels */}
        {parsedSourceLabels.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <LabelsEntry
              labels={parsedSourceLabels.map(l => {
                const parts = l.split('=');
                return { key: parts[0], value: parts.slice(1).join('=') };
              })}
              selected={sourceLabelsSelection}
              onClick={handleSourceLabelClick}
            />
          </Box>
        )}
      </Box>

      {/* Arrow */}
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
        <HubbleIcon name="arrow-right" sx={{ color: 'text.secondary', fontSize: 18 }} />
      </Box>

      {/* Destination */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Destination
        </Typography>

        {/* Destination Pod */}
        {flow.destinationPod && flow.destinationPod !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <PodEntry
              podName={flow.destinationPod}
              namespace={flow.destinationNamespace}
              isSelected={isSelectedFilter('pod', podKey(flow.destinationPod, flow.destinationNamespace), 'to', filters?.pods?.get(podKey(flow.destinationPod, flow.destinationNamespace)) === 'to')}
              onClick={handleDestPodClick}
            />
          </Box>
        )}

        {/* Destination Identity */}
        {flow.destinationIdentity && flow.destinationIdentity !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mr: 0.5 }}>
              Identity:
            </Typography>
            <IdentityEntry
              identity={flow.destinationIdentity}
              isSelected={isSelectedFilter('identity', flow.destinationIdentity, 'to', filters?.identities?.get(flow.destinationIdentity) === 'to')}
              onClick={handleDestIdentityClick}
            />
          </Box>
        )}

        {/* Destination IP */}
        {flow.destinationIP && flow.destinationIP !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mr: 0.5 }}>
              IP:
            </Typography>
            <IPEntry
              ip={flow.destinationIP}
              isSelected={isSelectedFilter('ip', flow.destinationIP, 'to', filters?.ips?.get(flow.destinationIP) === 'to')}
              onClick={handleDestIPClick}
            />
          </Box>
        )}

        {/* Destination DNS */}
        {flow.destinationDns && flow.destinationDns !== '-' && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mr: 0.5 }}>
              DNS:
            </Typography>
            <DnsEntry
              dns={flow.destinationDns}
              isSelected={dnsSelected}
              onClick={handleDnsClick}
            />
          </Box>
        )}

        {/* Destination Labels */}
        {parsedDestLabels.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <LabelsEntry
              labels={parsedDestLabels.map(l => {
                const parts = l.split('=');
                return { key: parts[0], value: parts.slice(1).join('=') };
              })}
              selected={destLabelsSelection}
              onClick={handleDestLabelClick}
            />
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Port & Protocol */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Destination port • protocol
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.primary' }}>
          {flow.destinationPort} • {getProtocol()}
        </Typography>
      </Box>

      {/* L7 Info */}
      {flow.l7info && flow.l7info !== '-' && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            L7 info
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'text.primary',
              wordBreak: 'break-all',
            }}
          >
            {flow.l7info}
          </Typography>
        </Box>
      )}

      {/* Latency */}
      {flow.latency !== undefined && flow.latency > 0 && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Latency
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.primary' }}>
            {flow.latency.toFixed(2)} ms
          </Typography>
        </Box>
      )}

      {/* Authentication */}
      {flow.authentication && flow.authentication !== '-' && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Authentication
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.primary' }}>
            {flow.authentication}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

FlowDetailsPanel.displayName = 'FlowDetailsPanel';
