import { keyframes } from '@emotion/react';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const label = t('common.refresh');

  return <Tooltip title={label}>
    <span style={{ display: 'inline-flex' }}>
      <IconButton aria-label={label} aria-busy={loading} disabled={loading} onClick={onClick}>
        <RefreshIcon sx={{
          animation: loading ? `${spin} 800ms linear infinite` : 'none',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }} />
      </IconButton>
    </span>
  </Tooltip>;
}
