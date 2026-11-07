// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { RuntimeMonitor } from './RuntimeMonitor';
import { dataplaneApi } from '../../services/dataplane';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('shows incomplete sources and preserves workload-only network evidence', async () => {
  await i18n.changeLanguage('zh-CN');
  vi.spyOn(dataplaneApi, 'monitor').mockResolvedValue({
    enabled: true, mode: 'observe', checked_at: '2026-10-31T00:00:00Z',
    profiles: [{ name: 'web', namespace: 'demo', pod_labels: { app: 'web' }, allowed_egress_cidrs: [] }],
    sources: [{ source: 'network', state: 'degraded', checked_at: '', samples: 1000, skipped: 0, truncated: true }],
    limitations: [], findings: [{ id: '1', rule: 'RT-NET-001', layer: 'network', profile: 'web', severity: 'medium', description: 'tcp_destination_outside_declared_dependencies', first_seen: '2026-10-31T00:00:00Z', last_seen: '2026-10-31T00:00:00Z', samples: 2, namespace: 'demo', pod: 'web-1', object: '192.0.2.1:443', evidence: 'workload_connection_attempt_only' }],
  });
  render(<I18nextProvider i18n={i18n}><RuntimeMonitor autoRefresh={false} /></I18nextProvider>);
  expect(await screen.findByText('RT-NET-001')).toBeTruthy();
  expect(screen.getByText('demo/web-1')).toBeTruthy();
  expect(screen.getByText('仅能确认工作负载连接尝试')).toBeTruthy();
  expect(screen.getByText('数据不完整或来源不可用，请检查采集和限速。')).toBeTruthy();
  expect(screen.getByText(/这些画像的外联异常规则暂不启用/)).toBeTruthy();
});
