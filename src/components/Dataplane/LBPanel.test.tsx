// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LBPanel } from './LBPanel';
import type { DataplaneReport } from '../../types/dataplane';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
it('shows an IPAM rejection and its reason instead of an allocated or indefinitely pending state', () => {
  const report: DataplaneReport = {
    checked_at: new Date().toISOString(), components: [], nodes: [], issues: [],
    xdp: { state: 'unconfigured', targets: [] },
    lb: { state: 'available', pools: [], services: [{ name: 'outside-lb', namespace: 'test', addresses: [], ports: ['80/TCP'], state: 'rejected', reason: 'no_pool', message: 'Requested VIP is outside every pool' }] },
  };
  render(<LBPanel report={report} />);
  expect(screen.getByText('Requested VIP is outside every pool')).toBeTruthy();
  expect(screen.getByText('dataplane.states.rejected')).toBeTruthy();
  expect(screen.queryByText('dataplane.states.allocated')).toBeNull();
  expect(screen.queryByText('dataplane.states.pending')).toBeNull();
});
