import { HubbleIcon } from './HubbleIcon';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { DragPanel } from './DragPanel';

import type { FlowData } from './flowData';
export type { FlowData } from './flowData';

interface FlowsTableProps {
  flows: FlowData[];
  loading?: boolean;
  selectedFlowId?: string | null;
  onFlowSelect?: (flow: FlowData) => void;
  onClose?: () => void;
}

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 36;

const COLUMN_CONFIG = [
  { key: 'sourcePod', label: 'sourcePod', width: '22%' },
  { key: 'sourceIP', label: 'sourceIP', width: '10%' },
  { key: 'sourceIdentity', label: 'sourceIdentity', width: '22%' },
  { key: 'destinationPod', label: 'destinationPod', width: '22%' },
  { key: 'destinationIP', label: 'destinationIP', width: '10%' },
  { key: 'destinationIdentity', label: 'destinationIdentity', width: '22%' },
  { key: 'destinationPort', label: 'destinationPort', width: '12%' },
  { key: 'l7info', label: 'l7info', width: '10%' },
  { key: 'trafficDirection', label: 'trafficDirection', width: '12%' },
  { key: 'verdict', label: 'verdict', width: '12%' },
  { key: 'authentication', label: 'authentication', width: '12%' },
  { key: 'tcpFlags', label: 'tcpFlags', width: '12%' },
  { key: 'timestamp', label: 'timestamp', width: '22%' },
];

// Hubble UI default visible columns (matching Hubble UI's default set)
const DEFAULT_VISIBLE_COLUMNS = new Set([
  'sourceIdentity', 'destinationIdentity', 'destinationPort', 'l7info', 'verdict', 'timestamp',
]);

export const FlowsTable: React.FC<FlowsTableProps> = memo(({
  flows,
  loading = false,
  selectedFlowId,
  onFlowSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_VISIBLE_COLUMNS);

  const getVerdictColor = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'forwarded':
        return colors.success.light;
      case 'dropped':
        return colors.error.light;
      case 'denied':
        return colors.warning.light;
      case 'audit':
        return colors.info.light;
      default:
        return colors.text.secondary;
    }
  };

  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const visibleColumnList = COLUMN_CONFIG.filter((col) => visibleColumns.has(col.key));

  if (loading && flows.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('topology.loadingFlows')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <DragPanel
          visibleColumns={visibleColumns}
          onToggleColumn={handleColumnToggle}
        />

        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 500 }}>
          {t('topology.flows')} ({flows.length})
        </Typography>

        {selectedFlowId && (
          <Tooltip title={t('topology.closeDetails')}>
            <IconButton size="small" onClick={onClose} sx={{ borderRadius: '4px' }}>
              <HubbleIcon name="cross" fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Column Headers */}
      <Box
        data-testid="flow-column-headers"
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? colors.background.elevatedDark : colors.background.paper,
          minHeight: HEADER_HEIGHT,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {visibleColumnList.map((col) => (
          <Box
            key={col.key}
            sx={{
              width: col.width,
              minWidth: 0,
              flexShrink: 1,
              px: 1,
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {t(`topology.tableColumns.${col.label}`)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Flow List */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {flows.length > 0 ? (
          flows.map((flow) => {
            const isSelected = selectedFlowId === flow.id;
            return (
              <Box
                key={flow.id}
                onClick={() => onFlowSelect?.(flow)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  minHeight: ROW_HEIGHT,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isSelected
                    ? isDark
                      ? 'rgba(85, 136, 211, 0.2)'
                      : 'rgba(85, 136, 211, 0.1)'
                    : 'transparent',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                {visibleColumnList.map((col) => (
                  <Box
                    key={col.key}
                    sx={{
                      width: col.width,
                      minWidth: 0,
                      flexShrink: 1,
                      px: 1,
                      overflow: 'hidden',
                    }}
                  >
                    {col.key === 'verdict' ? (
                      <Chip
                        label={flow.verdict}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          maxWidth: '100%',
                          bgcolor: 'transparent',
                          color: getVerdictColor(flow.verdict),
                          borderRadius: '4px',
                        }}
                      />
                    ) : col.key === 'trafficDirection' ? (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 11,
                          color:
                            flow.trafficDirection === 'ingress'
                              ? colors.primary.light
                              : flow.trafficDirection === 'egress'
                              ? colors.warning.light
                              : colors.text.secondary,
                        }}
                      >
                        {flow.trafficDirection}
                      </Typography>
                    ) : col.key === 'sourceIdentity' ? (
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 11, color: 'text.primary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {flow.sourceService || flow.sourcePod || '-'}
                        </Typography>
                        {flow.sourceNamespace ? (
                          <Typography
                            variant="caption"
                            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {flow.sourceNamespace}
                          </Typography>
                        ) : flow.sourceIP ? (
                          <Typography
                            variant="caption"
                            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {flow.sourceIP}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : col.key === 'destinationIdentity' ? (
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 11, color: 'text.primary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {flow.destinationService || flow.destinationPod || '-'}
                        </Typography>
                        {flow.destinationNamespace ? (
                          <Typography
                            variant="caption"
                            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {flow.destinationNamespace}
                          </Typography>
                        ) : flow.destinationIP ? (
                          <Typography
                            variant="caption"
                            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {flow.destinationIP}
                          </Typography>
                        ) : null}
                      </Box>
                    ) : col.key === 'l7info' ? (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 11,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          maxWidth: '100%',
                        }}
                        title={flow.l7info}
                      >
                        {flow.l7info || '-'}
                      </Typography>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 11,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          maxWidth: '100%',
                        }}
                        title={String(flow[col.key as keyof FlowData] || '-')}
                      >
                        {flow[col.key as keyof FlowData] || '-'}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            );
          })
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('topology.noFlows')}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
});

FlowsTable.displayName = 'FlowsTable';
