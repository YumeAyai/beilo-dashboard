// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import '../../i18n';
import { ServiceMapCanvas } from './ServiceMapCanvas';
import { BBoxCollector, type AllCoords } from '../ServiceMap/domain/bbox-collector';
import { XYWH } from '../ServiceMap/geometry';
import type { ServiceMapNode } from '../ServiceMap/service-map/types';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('selects a card once, preserves highlight state and only clears selection on a pane click', () => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const nodes: ServiceMapNode[] = [{ id: 'demo/service', position: { x: 10, y: 20 }, data: { id: 'demo/service', label: 'frontend', namespace: 'demo', type: 'service' } }];
  const onNodeClick = vi.fn(); const onPaneClick = vi.fn();
  const view = render(<ServiceMapCanvas nodes={nodes} edges={[]} selectedNodeId="demo/service" highlightedNodeIds={new Set(['demo/service'])} onNodeClick={onNodeClick} onPaneClick={onPaneClick} />);
  const title = screen.getByText('frontend');
  expect(title.closest('.service-map-card')?.classList.contains('active')).toBe(true);
  fireEvent.click(title);
  expect(onNodeClick).toHaveBeenCalledExactlyOnceWith(nodes[0].data);
  expect(onPaneClick).not.toHaveBeenCalled();
  fireEvent.click(view.container.querySelector('svg')!);
  expect(onPaneClick).toHaveBeenCalledTimes(1);
});

it('keeps the map mounted during loading and renders real UDP access points after loading', () => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const view = render(<ServiceMapCanvas nodes={[]} edges={[]} loading />);
  const svg = view.container.querySelector('svg');
  expect(svg).not.toBeNull();
  const nodes: ServiceMapNode[] = [{ id: 'dns', position: { x: 0, y: 0 }, data: {
    id: 'dns', label: 'kube-dns', namespace: 'kube-system', type: 'database',
    accessPoints: [{ port: 53, protocol: 'UDP', l7Protocol: 'DNS' }],
  } }];
  view.rerender(<ServiceMapCanvas nodes={nodes} edges={[]} />);
  expect(view.container.querySelector('svg')).toBe(svg);
  expect(screen.getByText('53')).toBeTruthy();
  expect(screen.getByText('UDP')).toBeTruthy();
  expect(screen.getByText('DNS')).toBeTruthy();
  expect(view.container.querySelector('[data-hubble-logo]')?.getAttribute('src')).toBe('/hubble/icons/logos/kubernetes-logo.svg');
  expect(view.container.querySelector('img[src$="access-point.svg"]')).not.toBeNull();
  expect(view.container.querySelector('[data-hubble-icon="zoom-to-fit"]')).not.toBeNull();
  expect(screen.queryByText('80')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Zoom in|放大/ }));
  expect(screen.getByText('125%')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Zoom out|縮小|缩小/ }));
  expect(screen.getByText('100%')).toBeTruthy();
});

it('renders a shared port connector once in front of cards, while retaining both sender paths', () => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const nodes: ServiceMapNode[] = ['a', 'b', 'api'].map(id => ({ id, position: { x: 0, y: 0 }, data: {
    id, label: id, namespace: 'demo', type: 'service', ports: id === 'api' ? [8080] : [],
  } }));
  const view = render(<ServiceMapCanvas nodes={nodes} edges={[
    { id: 'a-api', source: 'a', target: 'api', destinationPort: 8080, protocol: 'TCP', verdict: 'forwarded' },
    { id: 'b-api', source: 'b', target: 'api', destinationPort: 8080, protocol: 'TCP', verdict: 'dropped' },
  ]} />);
  expect(view.container.querySelectorAll('g.arrow-body')).toHaveLength(2);
  expect(view.container.querySelectorAll('circle.ending-connector')).toHaveLength(1);
  expect(view.container.querySelectorAll('line.inner')).toHaveLength(1);
  expect(view.container.querySelector('line.outer-inner-line')?.getAttribute('stroke')).toBe('#EBEEF0');
  expect(view.container.querySelector('line.inner')?.getAttribute('stroke')).toBe('#C50000');
  const cards = view.container.querySelector('.visible-cards')!;
  const branches = view.container.querySelector('.access-point-arrows')!;
  expect(cards.compareDocumentPosition(branches) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('removes cards, arrows, namespace backplates and zoom controls when collected flows become empty', () => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const nodes: ServiceMapNode[] = [{ id: 'service', position: { x: 0, y: 0 }, data: { id: 'service', label: 'api', namespace: 'demo', type: 'service' } }];
  const view = render(<ServiceMapCanvas nodes={nodes} edges={[]} namespaceFilter="demo" />);
  expect(view.container.querySelector('.service-map-card')).not.toBeNull();
  view.rerender(<ServiceMapCanvas nodes={[]} edges={[]} namespaceFilter="demo" />);
  expect(view.container.querySelector('.service-map-card')).toBeNull();
  expect(view.container.querySelector('.arrow-body')).toBeNull();
  expect(view.container.querySelector('rect[stroke-dasharray]')).toBeNull();
  expect(screen.queryByRole('button', { name: /Zoom in|放大/ })).toBeNull();
  expect(screen.getByText('No data found to render a service map')).toBeTruthy();
});

it('preserves manual zoom when live updates add a card, until Fit view is requested', () => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  let emit: (coords: AllCoords) => void = () => {};
  vi.spyOn(BBoxCollector.prototype, 'onCoordsUpdated').mockImplementation(function(this: BBoxCollector, callback) {
    if (callback) emit = callback;
    return this;
  });
  const nodes: ServiceMapNode[] = ['a', 'b'].map(id => ({ id, position: { x: 0, y: 0 }, data: { id, label: id, namespace: 'demo', type: 'service' } }));
  const view = render(<ServiceMapCanvas nodes={[nodes[0]]} edges={[]} namespaceFilter="all" />);
  act(() => emit({ cards: [{ id: 'a', bbox: XYWH.fromArgs(0, 0, 560, 120) }], accessPoints: [] }));
  fireEvent.click(screen.getByRole('button', { name: /Zoom in|放大/ }));
  const before = view.container.querySelector('svg > g')!.getAttribute('transform');
  view.rerender(<ServiceMapCanvas nodes={nodes} edges={[{ id: 'ab', source: 'a', target: 'b' }]} namespaceFilter="all" />);
  act(() => emit({ cards: [
    { id: 'a', bbox: XYWH.fromArgs(0, 0, 560, 120) },
    { id: 'b', bbox: XYWH.fromArgs(760, 0, 560, 120) },
  ], accessPoints: [] }));
  expect(view.container.querySelector('svg > g')!.getAttribute('transform')).toBe(before);
  fireEvent.click(screen.getByRole('button', { name: /Fit to view|适应画布/ }));
  expect(view.container.querySelector('svg > g')!.getAttribute('transform')).not.toBe(before);
});
