// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { Dashboard } from './Dashboard';
import { dashboardApi, type ClusterHealthResponse } from '../services/api';
import i18n from '../i18n';

configure({ asyncUtilTimeout: 5000 });

vi.mock('../services/api', () => ({ dashboardApi: {
  getMetrics: vi.fn(async () => null), getClusterHealth: vi.fn(),
  getQPS: vi.fn(async () => ({ currentQPS: 0, peakQPS: 0, barData: [] })),
} }));
vi.mock('../hooks/useGridLayout', () => ({ useGridLayout: () => ({ layout: [], handleLayoutChange: vi.fn(), containerWidth: 1200 }) }));
vi.mock('react-grid-layout/legacy', () => ({ default: () => null }));
vi.mock('../components/RequestAttribution/RequestAttributionMap', () => ({ RequestAttributionMap: () => null }));
vi.mock('../components/Common', () => ({ DraggableCard: () => null, EAreaChart: () => null,
  ENightingaleChart: () => null, EHorizontalBar: () => null, EQpsHistogram: () => null }));

beforeEach(async () => { await i18n.changeLanguage('en-US'); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const measured: NonNullable<ClusterHealthResponse['protectionOverview']> = {
  entryCount: 5, ingressCount: 1, gatewayCount: 1, externalServiceCount: 3,
  businessServiceCount: 1, podCount: 5, readyPodCount: 4,
  entrySource: 'available', serviceSource: 'available', podSource: 'available',
};

async function renderOverview(protectionOverview?: ClusterHealthResponse['protectionOverview']) {
  vi.mocked(dashboardApi.getClusterHealth).mockResolvedValue({ overallStatus: 'healthy', components: [], ingressCount: 99, serviceCount: 88, protectionOverview });
  render(<I18nextProvider i18n={i18n}><Dashboard /></I18nextProvider>);
  await screen.findByText('Entry & Business Scale');
}

function expectPrimary(label: string, value: string) {
  expect(within(screen.getByText(label).parentElement!).getByText(value)).toBeTruthy();
}

async function showDetails(label: string) {
  const trigger = screen.getByText(label).closest('[tabindex="0"]')!;
  fireEvent.mouseOver(trigger);
  const tooltip = await screen.findByRole('tooltip');
  return { tooltip, close: async () => {
    fireEvent.mouseLeave(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  } };
}

describe('entry and business inventory', () => {
  it('shows only totals until hovering the entry and business summaries', async () => {
    await renderOverview(measured);
    expectPrimary('Entry Resources', '5');
    expectPrimary('Service under protection', '1');
    expect(screen.queryByText('Ingress')).toBeNull();
    expect(screen.queryByText('Ready Pods 4 / 5')).toBeNull();
    const entries = await showDetails('Entry Resources');
    for (const [label, count] of [['Ingress', '1'], ['Gateway', '1'], ['Direct Services', '3']]) {
      expect(within(within(entries.tooltip).getByText(label).parentElement!).getByText(count)).toBeTruthy();
    }
    await entries.close();
    const business = await showDetails('Service under protection');
    expect(within(business.tooltip).getByText('Ready Pods 4 / 5')).toBeTruthy();
    await business.close();
    expect(screen.queryByText('99')).toBeNull();
    expect(screen.queryByText('88')).toBeNull();
    expect(screen.queryByText('Service Nodes')).toBeNull();
  }, 15_000);

  it('keeps Service count unchanged when Pods scale down', async () => {
    await renderOverview({ ...measured, podCount: 1, readyPodCount: 1 });
    expectPrimary('Service under protection', '1');
    const { tooltip } = await showDetails('Service under protection');
    expect(within(tooltip).getByText('Ready Pods 1 / 1')).toBeTruthy();
  });

  it.each([undefined, { ...measured, entryCount: null, businessServiceCount: null, podCount: null, readyPodCount: null, entrySource: 'unavailable', serviceSource: 'unavailable', podSource: 'unavailable' } as const])('shows unknown for an absent or unavailable inventory', async (inventory) => {
    await renderOverview(inventory);
    for (const label of ['Entry Resources', 'Service under protection']) expectPrimary(label, '—');
    const { tooltip } = await showDetails('Service under protection');
    expect(within(tooltip).getByText('Pod instances unavailable')).toBeTruthy();
  });

  it('keeps known Services visible if only the Pod source fails', async () => {
    await renderOverview({ ...measured, podCount: null, readyPodCount: null, podSource: 'unavailable' });
    expectPrimary('Service under protection', '1');
    const { tooltip } = await showDetails('Service under protection');
    expect(within(tooltip).getByText('Pod instances unavailable')).toBeTruthy();
  });

  it('keeps measured zero distinct from an unavailable source', async () => {
    await renderOverview({ ...measured, entryCount: 0, ingressCount: 0, gatewayCount: 0, externalServiceCount: 0, businessServiceCount: 0, podCount: 0, readyPodCount: 0 });
    for (const label of ['Entry Resources', 'Service under protection']) expectPrimary(label, '0');
    const { tooltip } = await showDetails('Service under protection');
    expect(within(tooltip).getByText('Ready Pods 0 / 0')).toBeTruthy();
  });

  it('translates the card and clears counts when the next inventory fails', async () => {
    await renderOverview(measured);
    vi.mocked(dashboardApi.getClusterHealth).mockRejectedValue(new Error('inventory unavailable'));
    await act(async () => { await i18n.changeLanguage('ja-JP'); });
    await screen.findByText('入口と業務の規模');
    for (const label of ['入口リソース', '保護中の Service']) expectPrimary(label, '—');
  });
});
