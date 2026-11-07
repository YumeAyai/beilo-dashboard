import { Box, Chip, Typography } from '@mui/material';
import { memo } from 'react';
import { colors } from '../../theme/colors';

export interface DirectionProps {
  filterDirection?: 'from' | 'to';
}

export interface LabelsEntryProps extends DirectionProps {
  labels: Array<{ key: string; value: string }>;
  selected: Set<string>;
  onClick: (label: string) => void;
}

export const LabelsEntry = memo<LabelsEntryProps>(function LabelsEntry(props: LabelsEntryProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {props.labels.map(label => {
        const labelStr = `${label.key}=${label.value}`;
        const isSelected = props.selected.has(labelStr);

        return (
          <Chip
            key={labelStr}
            label={`${label.key}=${label.value}`}
            size="small"
            onClick={() => props.onClick(labelStr)}
            sx={{
              height: 18,
              fontSize: 9,
              cursor: 'pointer',
              bgcolor: isSelected
                ? 'primary.main'
                : 'action.hover',
              color: isSelected
                ? 'primary.contrastText'
                : 'text.secondary',
              '&:hover': {
                bgcolor: isSelected
                  ? 'primary.dark'
                  : 'action.selected',
              },
            }}
          />
        );
      })}
    </Box>
  );
});

export interface TCPFlagsEntryProps {
  flags: string[];
  selected?: Set<string>;
  filterDirection?: 'from' | 'to';
  onClick?: (flag: string) => void;
}

export const TCPFlagsEntry = memo<TCPFlagsEntryProps>(function TCPFlagsEntry(props: TCPFlagsEntryProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {props.flags.map(flag => {
        const isSelected = props.selected ? props.selected.has(flag) : false;

        return (
          <Chip
            key={flag}
            label={flag.toUpperCase()}
            size="small"
            onClick={() => props.onClick?.(flag)}
            sx={{
              height: 18,
              fontSize: 9,
              cursor: props.onClick ? 'pointer' : 'default',
              bgcolor: isSelected
                ? 'warning.main'
                : 'action.hover',
              color: isSelected
                ? 'warning.contrastText'
                : 'text.secondary',
            }}
          />
        );
      })}
    </Box>
  );
});

export interface VerdictEntryProps {
  verdict: string;
  isSelected: boolean;
  onClick?: () => void;
}

export const VerdictEntry = memo<VerdictEntryProps>(function VerdictEntry(props: VerdictEntryProps) {
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

  const verdictColor = getVerdictColor(props.verdict);

  return (
    <Chip
      label={props.verdict}
      size="small"
      onClick={props.onClick}
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        cursor: props.onClick ? 'pointer' : 'default',
        bgcolor: `${verdictColor}30`,
        color: verdictColor,
        borderRadius: '4px',
        '&:hover': props.onClick ? {
          bgcolor: `${verdictColor}50`,
        } : {},
      }}
    />
  );
});

export interface IPEntryProps {
  ip: string;
  isSelected: boolean;
  onClick?: () => void;
}

export const IPEntry = memo<IPEntryProps>(function IPEntry(props: IPEntryProps) {
  return (
    <Typography
      variant="caption"
      onClick={props.onClick}
      sx={{
        fontSize: 10,
        color: props.isSelected ? 'primary.main' : 'text.secondary',
        cursor: props.onClick ? 'pointer' : 'default',
        fontFamily: 'monospace',
        '&:hover': props.onClick ? {
          textDecoration: 'underline',
        } : {},
      }}
    >
      {props.ip}
    </Typography>
  );
});

export interface DnsEntryProps {
  dns: string;
  isSelected: boolean;
  onClick?: () => void;
}

export const DnsEntry = memo<DnsEntryProps>(function DnsEntry(props: DnsEntryProps) {
  return (
    <Typography
      variant="caption"
      onClick={props.onClick}
      sx={{
        fontSize: 10,
        color: props.isSelected ? 'primary.main' : 'text.secondary',
        cursor: props.onClick ? 'pointer' : 'default',
        '&:hover': props.onClick ? {
          textDecoration: 'underline',
        } : {},
      }}
    >
      {props.dns}
    </Typography>
  );
});

export interface IdentityEntryProps {
  identity: string;
  isSelected: boolean;
  onClick?: () => void;
}

export const IdentityEntry = memo<IdentityEntryProps>(function IdentityEntry(props: IdentityEntryProps) {
  return (
    <Typography
      variant="caption"
      onClick={props.onClick}
      sx={{
        fontSize: 10,
        color: props.isSelected ? 'primary.main' : 'text.secondary',
        cursor: props.onClick ? 'pointer' : 'default',
        '&:hover': props.onClick ? {
          textDecoration: 'underline',
        } : {},
      }}
    >
      {props.identity}
    </Typography>
  );
});

export interface PodEntryProps {
  podName: string;
  namespace?: string;
  isSelected: boolean;
  onClick?: () => void;
}

export const PodEntry = memo<PodEntryProps>(function PodEntry(props: PodEntryProps) {
  return (
    <Typography
      variant="caption"
      onClick={props.onClick}
      sx={{
        fontSize: 10,
        color: props.isSelected ? 'primary.main' : 'text.primary',
        cursor: props.onClick ? 'pointer' : 'default',
        fontWeight: 500,
        '&:hover': props.onClick ? {
          textDecoration: 'underline',
        } : {},
      }}
    >
      {props.namespace ? `${props.namespace}/${props.podName}` : props.podName}
    </Typography>
  );
});
