// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { FlowData } from './flowData';
import { FlowDetailsPanel, type FilterDirection } from './FlowDetailsPanel';

afterEach(cleanup);
const flow: FlowData = {
  id: 'flow', sourcePod: 'client', destinationPod: 'server', sourceNamespace: 'demo', destinationNamespace: 'demo',
  sourceIP: '192.0.2.1', destinationIP: '192.0.2.1', sourceIdentity: '1000', destinationIdentity: '1000',
  sourceLabels: ['app=shared'], destinationLabels: ['app=shared'], destinationPort: 80, l7info: '-',
  trafficDirection: 'ingress', verdict: 'forwarded', authentication: '-', tcpFlags: 'SYN, ACK', timestamp: '2026-11-01',
};
it('toggles source pod, identity and IP filters using the current direction, including after rerender', () => {
  const pod = vi.fn(); const identity = vi.fn(); const ip = vi.fn();
  const props = { flow, onFilterByPod: pod, onFilterByIdentity: identity, onFilterByIP: ip };
  const view = render(<FlowDetailsPanel {...props} filters={{ pods: new Map([['demo/client', 'from']]), identities: new Map([['1000', 'to']]), ips: new Map([['192.0.2.1', 'to']]) }} />);
  fireEvent.click(screen.getByText('demo/client')); expect(pod).toHaveBeenLastCalledWith('');
  fireEvent.click(screen.getAllByText('1000')[0]); expect(identity).toHaveBeenLastCalledWith('1000', 'from');
  fireEvent.click(screen.getAllByText('1000')[1]); expect(identity).toHaveBeenLastCalledWith('');
  fireEvent.click(screen.getAllByText('192.0.2.1')[0]); expect(ip).toHaveBeenLastCalledWith('192.0.2.1', 'from');
  view.rerender(<FlowDetailsPanel {...props} filters={{}} />);
  fireEvent.click(screen.getByText('demo/client')); expect(pod).toHaveBeenLastCalledWith('client', 'demo', 'from');
  fireEvent.click(screen.getAllByText('192.0.2.1')[1]); expect(ip).toHaveBeenLastCalledWith('192.0.2.1', 'to');
});
it('distinguishes identical source and destination labels and preserves TCP direction', () => {
  const label = vi.fn(); const flag = vi.fn();
  const filters = { labels: new Map<string, FilterDirection>([['app=shared', 'to']]), tcpFlags: new Map<string, FilterDirection>([['syn', 'to'], ['ack', 'from']]) };
  render(<FlowDetailsPanel flow={flow} filters={filters} onFilterByLabel={label} onFilterByTCPFlag={flag} />);
  fireEvent.click(screen.getAllByText('app=shared')[0]); expect(label).toHaveBeenLastCalledWith('app=shared', 'from');
  fireEvent.click(screen.getAllByText('app=shared')[1]); expect(label).toHaveBeenLastCalledWith('');
  fireEvent.click(screen.getByText('SYN')); expect(flag).toHaveBeenLastCalledWith('syn', 'from');
  fireEvent.click(screen.getByText('ACK')); expect(flag).toHaveBeenLastCalledWith('');
});
