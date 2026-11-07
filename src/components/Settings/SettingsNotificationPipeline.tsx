import { useCallback, useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { notificationApi2 } from '../../services/api';
import type { NotificationChannel, NotificationJob, NotificationRule } from '../../services/api';
import { NotificationRules } from './NotificationRules';
import { NotificationJobs } from './NotificationJobs';
export function SettingsNotificationPipeline({ channels }: { channels: NotificationChannel[] }) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<NotificationRule[]>([]); const [jobs, setJobs] = useState<NotificationJob[]>([]);
  const [cursor, setCursor] = useState(''); const [next, setNext] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [currentRules, page] = await Promise.all([notificationApi2.getRules(), notificationApi2.getJobs(cursor)]);
      if (signal?.aborted) return; setRules(currentRules); setJobs(page.items); setNext(page.nextCursor);
    } catch (err) { console.error('Failed to load notification pipeline:', err); if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Failed to load notifications'); }
  }, [cursor]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); const timer = window.setInterval(() => void load(controller.signal), 3000); return () => { controller.abort(); window.clearInterval(timer); }; }, [load]);
  const mutate = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await operation(); await load(); } catch (err) { console.error('Notification operation failed:', err); setError(err instanceof Error ? err.message : 'Notification operation failed'); } finally { setBusy(false); }
  };
  const createRule = async (name: string, severity: string, ids: string[]) => mutate(() => notificationApi2.createRule({ name, description: '', conditions: [{ type: 'severity', operator: 'severity_at_least', value: severity }], actions: [{ type: 'send_notification', config: {} }], channelIDs: ids, isActive: true }));
  const deleteRule = async (id: string) => mutate(() => notificationApi2.deleteRule(id));
  const retryJob = async (job: NotificationJob) => {
    if (job.status === 'unknown' && !window.confirm(t('notificationPipeline.retryConfirm'))) return;
    await mutate(() => notificationApi2.retryJob(job.id, job.status === 'unknown'));
  };
  const refresh = () => { if (cursor) setCursor(''); else void load(); };
  return <Box>
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    <NotificationRules channels={channels} rules={rules} busy={busy} onCreate={createRule} onDelete={deleteRule} t={t} />
    <NotificationJobs jobs={jobs} channels={channels} next={next} busy={busy} onRefresh={refresh} onNext={() => setCursor(next)} onRetry={retryJob} t={t} />
  </Box>;
}
