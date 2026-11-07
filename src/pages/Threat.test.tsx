// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThreatMonitoring } from './Threat';
import { aggregationApi } from '../services/api';
import type { AggregationMetricsResponse, AggregationAttackEvent } from '../types/threat';
import i18n from '../i18n';

vi.mock('@mui/icons-material', () => ({ Refresh: () => null, Warning: () => null, Block: () => null, TrendingUp: () => null, Security: () => null, ErrorOutline: () => null }));
vi.mock('../services/api', () => ({ aggregationApi: { getMetrics: vi.fn() } }));
vi.mock('../hooks/useGridLayout', () => ({ useGridLayout: () => ({ layout: [], handleLayoutChange: vi.fn(), containerWidth: 1200 }) }));
vi.mock('react-grid-layout/legacy', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../components/Common', () => ({
 DraggableCard: ({ title, children }: { title: string; children: ReactNode }) => <section><h2>{title}</h2>{children}</section>,
 EAreaChart: ({ data }: { data: unknown }) => <div data-testid="trend">{JSON.stringify(data)}</div>,
 EPieChart: ({ data }: { data: unknown }) => <div data-testid="categories">{JSON.stringify(data)}</div>,
 SeverityChip: ({ severity }: { severity: string }) => <span>{severity}</span>,
}));
const event = (id: string, action: string, attackType: string): AggregationAttackEvent => ({
 id, ruleIDs: [], timestamp: '2026-11-03T00:00:00Z', sourceIP: '192.0.2.1', targetService: 'test', targetNamespace: 'default', url: '/'+id, attackType, severity: 'high', action,
});
const metrics: AggregationMetricsResponse = {
 timestamp: '', lastSync: '', totalRequests: 100, threatRequests: 11, blockedRequests: 7, blockedIPCount: 3,
 threatEvents: [event('alert','detected','sql_injection'), event('blocked','blocked','xss')],
 topAttackers: [{ sourceIP: '192.0.2.1', threatCount: 11, requestCount: 20, blockedCount: 7, status: 'Monitored', topThreatTypes: ['xss'], firstSeen: '', lastSeen: '', blocked: false }],
 threatTrend: [{ time: '1793646000', threats: 11, blocked: 7 }],
 threatLevel: { criticalCount: 0, highCount: 3, mediumCount: 1, lowCount: 0 },
};
function mount() { return render(<I18nextProvider i18n={i18n}><ThreatMonitoring /></I18nextProvider>); }
function card(label: string) { return screen.getAllByText(label).find(element => element.closest('.MuiCard-root'))!.closest('.MuiCard-root') as HTMLElement; }
beforeEach(async () => {
 await i18n.changeLanguage('zh-CN');
 vi.mocked(aggregationApi.getMetrics).mockResolvedValue(metrics);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('restored unified Threat page structure', () => {
 it('loads one unified endpoint and restores the four cards and five panels', async () => {
  mount(); await screen.findByText('/alert');
  expect(aggregationApi.getMetrics).toHaveBeenCalledExactlyOnceWith(100, '1h');
  for (const [label,value] of [['totalRequests','100'],['threatDetected','11'],['blocked','7'],['blockedIp','3']]) {
   expect(within(card(i18n.t('threat.stats.'+label))).getByText(value)).toBeTruthy();
  }
  for (const panel of ['threatTrend','threatTypeDistribution','threatLevelDistribution','attackSourceRanking','recentThreats']) {
   expect(screen.getByRole('heading',{name:i18n.t('threat.charts.'+panel)})).toBeTruthy();
  }
  expect(screen.getAllByRole('heading',{level:2})).toHaveLength(5);
  expect(screen.queryByRole('group')).toBeNull();
  expect(screen.queryByText('日志样本计数')).toBeNull();
 });
 it('restores all five source ranking columns and counts', async () => {
  mount(); await screen.findByText('/alert');
  const table=within(screen.getAllByRole('table')[0]);
  const headings=table.getAllByRole('columnheader').map(e=>e.textContent);
  expect(headings).toEqual([i18n.t('threat.table.ip'),i18n.t('threat.table.threatCount'),i18n.t('threat.table.requests'),i18n.t('threat.table.blockedCount'),i18n.t('common.status')]);
  const row=within(table.getAllByRole('row')[1]);
  for (const text of ['192.0.2.1','11','20','7',i18n.t('status.monitoring')]) expect(row.getByText(text)).toBeTruthy();
 });
 it('shows both actions together and reads distributions and trend from the unified payload', async () => {
  mount(); await screen.findByText('/alert');
  expect(within(screen.getByText('/alert').closest('tr')!).getByText(i18n.t('status.suspicious'))).toBeTruthy();
  expect(within(screen.getByText('/blocked').closest('tr')!).getByText(i18n.t('status.blocked'))).toBeTruthy();
  const categories=JSON.parse(screen.getByTestId('categories').textContent!);
  expect(categories.map(({name,value}:{name:string;value:number})=>({name,value}))).toEqual([{name:i18n.t('attackType.sqlInjection'),value:1},{name:i18n.t('attackType.xss'),value:1}]);
  expect(JSON.parse(screen.getByTestId('trend').textContent!)).toEqual(metrics.threatTrend);
 });
 it('keeps severity percentages finite and based on severity counts', async () => {
  mount(); await screen.findByText('/alert');
  expect(screen.getByRole('progressbar',{name:i18n.t('threatLevel.medium')}).getAttribute('aria-valuenow')).toBe('25');
  for (const bar of screen.getAllByRole('progressbar')) {
   const value=Number(bar.getAttribute('aria-valuenow'));expect(Number.isFinite(value)&&value>=0&&value<=100).toBe(true);
  }
 });
 it('refreshes the same unified endpoint when the selected duration changes', async () => {
  mount(); await screen.findByText('/alert');
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option',{name:i18n.t('threat.timeRange.24hours')}));
  await waitFor(()=>expect(aggregationApi.getMetrics).toHaveBeenLastCalledWith(100,'24h'));
  expect(aggregationApi.getMetrics).toHaveBeenCalledTimes(2);
 });
 it('shows a localized loading error when the unified request fails', async () => {
  vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.mocked(aggregationApi.getMetrics).mockRejectedValue(new Error('offline'));mount();
  await screen.findByText(i18n.t('threat.fetchFailed'));
  expect(aggregationApi.getMetrics).toHaveBeenCalledTimes(1);
 });
 it('handles an empty unified result', async () => {
  vi.mocked(aggregationApi.getMetrics).mockResolvedValue({...metrics,totalRequests:0,threatRequests:0,blockedRequests:0,blockedIPCount:0,threatEvents:[],topAttackers:[],threatTrend:[],threatLevel:{criticalCount:0,highCount:0,mediumCount:0,lowCount:0}});
  mount(); await screen.findByRole('heading',{name:i18n.t('threat.charts.recentThreats')});
  expect(within(card(i18n.t('threat.stats.threatDetected'))).getByText('0')).toBeTruthy();
  expect(screen.getAllByRole('table')[1].querySelectorAll('tbody tr')).toHaveLength(0);
 });
 it.each(['zh-CN','zh-TW','en-US','ja-JP'])('retains translations in %s', async locale => {
  await i18n.changeLanguage(locale);mount();await screen.findByText('/alert');
  expect(screen.getByRole('heading',{name:i18n.t('threat.charts.recentThreats')})).toBeTruthy();
  expect(within(card(i18n.t('threat.stats.threatDetected'))).getByText('11')).toBeTruthy();
  expect(screen.queryByText('threat.fetchFailed')).toBeNull();
 });
});
