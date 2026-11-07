import { RefreshButton } from '../components/Common/RefreshButton';
import { useCallback, useState } from 'react';
import { Alert, Box, FormControlLabel, Stack, Switch, Tab, Typography } from '@mui/material';
import { Layers } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dataplaneApi } from '../services/dataplane';
import { useDataplaneResource } from '../hooks/useDataplaneResource';
import { DataplaneOverview } from '../components/Dataplane/Overview';
import { XDPPanel } from '../components/Dataplane/XDPPanel';
import { LBPanel } from '../components/Dataplane/LBPanel';
import { RuntimePolicies } from '../components/Dataplane/RuntimePolicies';
import { RuntimeEvents } from '../components/Dataplane/RuntimeEvents';
import { RuntimeMonitor } from '../components/Dataplane/RuntimeMonitor';
import { RemoteNotice } from '../components/Dataplane/Observation';
import { observationTime } from '../components/Dataplane/format';
import { PageLayout, PageTabs } from '../components/Common/PageLayout';

const tabNames = ['overview', 'xdp', 'runtime', 'lb'];

export function Dataplane() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const requestedTab = params.get('tab') || 'overview';
  const tab = tabNames.includes(requestedTab) ? requestedTab : 'overview';
  const load = useCallback((signal: AbortSignal) => dataplaneApi.status(signal), []);
  const remote = useDataplaneResource('dataplane', load, autoRefresh);
  const selectTab = (value: string) => { const next = new URLSearchParams(params); next.set('tab', value); setParams(next); };
  const report = remote.data;
  return <PageLayout title={t('dataplane.title')} subtitle={t('dataplane.subtitle')} icon={<Layers />} actions={<>
        <FormControlLabel control={<Switch checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} sx={{ color: 'white', mx: 1 }} />} label={t('threat.autoRefresh')} />
        <RefreshButton loading={remote.loading} onClick={() => { void remote.refresh(); }} />
      </>}>
    <Stack spacing={2.5}>
      <PageTabs value={tab} onChange={(_, value: string) => selectTab(value)} aria-label={t('dataplane.title')}>
        {tabNames.map(name => <Tab key={name} value={name} label={t(`dataplane.tabs.${name}`)} id={`dataplane-tab-${name}`} aria-controls={`dataplane-panel-${name}`} />)}
      </PageTabs>
      <RemoteNotice error={remote.error} loading={remote.loading && !report} />
      {remote.error && report && <Alert severity="warning">{t('dataplane.staleData')}</Alert>}
      {report && <Typography variant="caption" color="text.secondary">{t('dataplane.checkedAt')}：{observationTime(report.checked_at)}</Typography>}
      {report?.issues.map(issue => <Alert key={issue.source} severity="warning">{t(`dataplane.sources.${issue.source}`, { defaultValue: issue.source })}：{t('dataplane.sourceUnavailable')}</Alert>)}
      <Box role="tabpanel" id={`dataplane-panel-${tab}`} aria-labelledby={`dataplane-tab-${tab}`}>
        {tab === 'overview' && report && <DataplaneOverview report={report} selectTab={selectTab} />}
        {tab === 'xdp' && report && <XDPPanel report={report} />}
        {tab === 'lb' && report && <LBPanel report={report} />}
        {tab === 'runtime' && <Stack spacing={2}>
          <Alert severity="info">{t('dataplane.runtimeHint')}</Alert>
          {report?.components.find(component => component.id === 'tetragon')?.state === 'not_installed' && <Alert severity="warning">{t('dataplane.noTetragon')}</Alert>}
          <RuntimeMonitor autoRefresh={autoRefresh} /><RuntimePolicies autoRefresh={autoRefresh} /><RuntimeEvents autoRefresh={autoRefresh} />
        </Stack>}
      </Box>
    </Stack>
  </PageLayout>;
}
