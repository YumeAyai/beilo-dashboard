import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function ClusterState({ state }: { state: string }) {
  const { t } = useTranslation();
  const color = ['available', 'ready', 'allocated', 'configured', 'attached'].includes(state) ? 'success'
    : ['degraded', 'not_ready', 'conflict', 'rejected', 'unavailable', 'detached'].includes(state) ? 'error' : 'default';
  return <Chip size="small" variant="outlined" color={color} label={t(`clusterManagement.state_${state}`, { defaultValue: t('clusterManagement.state_unknown') })} />;
}
