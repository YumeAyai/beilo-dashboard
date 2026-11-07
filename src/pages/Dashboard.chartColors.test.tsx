// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Dashboard } from './Dashboard';
import { dashboardApi } from '../services/api';
import i18n from '../i18n';
import { ThemeConfig } from '../theme/ThemeConfig';
import { useThemeContext } from '../theme/useThemeContext';

type Slice = { name: string; value: number; color: string };
const captured = vi.hoisted(() => ({ rings: {} as Record<string, Slice[]> }));
vi.mock('../services/api', () => ({ dashboardApi: {
  getMetrics: vi.fn(), getClusterHealth: vi.fn(async () => null),
  getQPS: vi.fn(async () => ({ currentQPS: 0, peakQPS: 0, barData: [] })),
} }));
vi.mock('../hooks/useGridLayout', () => ({ useGridLayout: () => ({ layout: [], handleLayoutChange: vi.fn(), containerWidth: 1200 }) }));
vi.mock('react-grid-layout/legacy', () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock('../components/RequestAttribution/RequestAttributionMap', () => ({ RequestAttributionMap: () => null }));
vi.mock('../components/Common', () => ({
  DraggableCard: ({ children }: { children: ReactNode }) => children,
  EAreaChart: () => null, EHorizontalBar: () => null, EQpsHistogram: () => null,
  ENightingaleChart: ({ outerName, innerName, outerData, innerData }: { outerName: string; innerName: string; outerData: Slice[]; innerData: Slice[] }) => {
    captured.rings[outerName] = outerData;
    captured.rings[innerName] = innerData;
    return null;
  },
}));

function Toggle() {
  const { toggleTheme } = useThemeContext();
  return <button onClick={toggleTheme}>Toggle chart theme</button>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); localStorage.clear(); });

it('updates chart colors immediately on theme change and keeps category colors stable after rank changes', async () => {
  vi.useFakeTimers();
  localStorage.setItem('theme-mode', 'light');
  const metrics = {
    totalRequests: 100, threatRequests: 0, blockedRequests: 0,
    clientSource: { browser: [{ name: 'Chrome', value: 80 }, { name: 'Safari', value: 20 }], os: [{ name: 'Linux', value: 100 }] },
    responseStatus: { waf: [{ name: '200', value: 90 }, { name: '502', value: 10 }], origin: [{ name: '5xx', value: 100 }] },
  } as Awaited<ReturnType<typeof dashboardApi.getMetrics>>;
  vi.mocked(dashboardApi.getMetrics).mockResolvedValue(metrics);
  await act(async () => {
    render(<I18nextProvider i18n={i18n}><ThemeConfig><Toggle /><Dashboard /></ThemeConfig></I18nextProvider>);
  });
  expect(captured.rings.Browser.map(item => item.color)).toEqual(['#69B4FF', '#B5A0F4']);
  expect(captured.rings.WAF.find(item => item.name === '502')?.color).toBe('#FF8A8A');
  const requests = vi.mocked(dashboardApi.getMetrics).mock.calls.length;
  fireEvent.click(screen.getByText('Toggle chart theme'));
  expect(captured.rings.Browser.map(item => item.color)).toEqual(['#668CAF', '#977BB4']);
  expect(captured.rings.WAF.find(item => item.name === '502')?.color).toBe('#B46B77');
  expect(captured.rings.Origin[0].color).toBe('#B46B77');
  expect(dashboardApi.getMetrics).toHaveBeenCalledTimes(requests);
  vi.mocked(dashboardApi.getMetrics).mockResolvedValue({ ...metrics, clientSource: {
    ...metrics.clientSource, browser: [{ name: 'Chrome', value: 10 }, { name: 'Safari', value: 90 }],
  } });
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(captured.rings.Browser.map(item => [item.name, item.color])).toEqual([['Safari', '#977BB4'], ['Chrome', '#668CAF']]);
});
