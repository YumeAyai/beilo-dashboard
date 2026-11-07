import { Box } from '@mui/material';
import { type FunctionComponent, memo } from 'react';
import { normalizeLabelToString } from '../../../utils/labels';

interface EndpointCardLabelsProps {
  labels: Array<{ key: string; value: string }>;
}

export const EndpointCardLabels: FunctionComponent<EndpointCardLabelsProps> = memo(function EndpointCardLabels({
  labels,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexFlow: 'wrap',
        gap: 0,
        p: '10px 0',
        m: '0 20px',
      }}
    >
      {labels.map((label, idx) => (
        <Box
          key={idx}
          sx={{
            px: '10px',
            py: '5px',
            borderRadius: '5px',
            backgroundColor: '#eaeaea',
            color: '#929292',
            fontSize: 16,
            fontFamily: 'inherit',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '5px',
            '&:not(:last-child)': {
              marginRight: '5px',
            },
          }}
        >
          {normalizeLabelToString(label)}
        </Box>
      ))}
    </Box>
  );
});
