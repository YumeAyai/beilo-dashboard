// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGridLayout } from './useGridLayout';

const defaultLayout = [{ i: 'chart', x: 0, y: 0, w: 6, h: 8 }];
const widgets = { chart: 'chart' };
let measuredWidth = 900.5;
let observers: MockResizeObserver[];

class MockResizeObserver {
  target?: Element;
  private callback: ResizeObserverCallback;
  observe = vi.fn((target: Element) => { this.target = target; });
  disconnect = vi.fn();
  constructor(callback: ResizeObserverCallback) { this.callback = callback; observers.push(this); }
  resize(width: number) {
    this.callback([{ target: this.target, contentRect: new DOMRect(0, 0, width, 300) } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

function Harness({ visible = true, padded = false }: { visible?: boolean; padded?: boolean }) {
  const { containerRef, containerWidth, layout } = useGridLayout({ storageKey: 'test-grid', defaultLayout, widgets });
  return <>
    <output data-testid="width">{containerWidth}</output>
    <output data-testid="layout">{JSON.stringify(layout)}</output>
    {visible && <div ref={containerRef} style={padded ? { padding: '0 12px', border: '1px solid' } : undefined}>
      <input aria-label="Widget state" defaultValue="preserved" />
    </div>}
  </>;
}

beforeEach(() => {
  observers = [];
  measuredWidth = 900.5;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, measuredWidth, 300));
});

describe('default layout updates', () => {
  const previousDefaultLayout = [
    { i: 'qps', x: 8, y: 6, w: 4, h: 10 },
    { i: 'requests', x: 8, y: 16, w: 4, h: 6 },
  ];
  const updatedLayout = [
    { i: 'qps', x: 8, y: 0, w: 4, h: 5 },
    { i: 'requests', x: 8, y: 5, w: 4, h: 7 },
  ];
  const options = {
    storageKey: 'test-grid', defaultLayout: updatedLayout, previousDefaultLayout,
    widgets: { qps: 'qps', requests: 'requests' },
  };

  it('updates an untouched default even after grid compaction and reordering', () => {
    localStorage.setItem('test-grid', JSON.stringify(previousDefaultLayout
      .map(item => ({ ...item, y: item.y - 6, moved: false, static: false })).reverse()));
    const { result } = renderHook(() => useGridLayout(options));
    expect(result.current.layout).toEqual(updatedLayout);
  });

  it.each(['position', 'size'])('preserves a user-customized %s when the default changes', change => {
    const customized = previousDefaultLayout.map(item => ({ ...item, y: item.y - 6 }));
    if (change === 'position') customized[0].x = 0;
    else customized[0].h = 7;
    localStorage.setItem('test-grid', JSON.stringify(customized));
    const { result } = renderHook(() => useGridLayout(options));
    expect(result.current.layout).toEqual(customized);
    expect(JSON.parse(localStorage.getItem('test-grid')!)).toEqual(customized);
  });
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('draggable grid container measurements', () => {
  it('measures a container that mounts after loading without a timer or window resize', () => {
    const view = render(<Harness visible={false} />);
    expect(screen.getByTestId('width').textContent).toBe('0');
    expect(observers).toHaveLength(0);
    measuredWidth = 812.375;
    view.rerender(<Harness />);
    expect(screen.getByTestId('width').textContent).toBe('812.375');
    expect(observers).toHaveLength(1);
  });

  it('uses the content width, preserving fractional pixels and excluding padding and borders', () => {
    measuredWidth = 1200.75;
    render(<Harness padded />);
    expect(screen.getByTestId('width').textContent).toBe('1174.75');
    act(() => observers[0].resize(734.625));
    expect(screen.getByTestId('width').textContent).toBe('734.625');
  });

  it('responds to parent-only resizes without remounting widgets or changing saved grid units', () => {
    const saved = [{ ...defaultLayout[0], x: 3, w: 9 }];
    localStorage.setItem('test-grid', JSON.stringify(saved));
    render(<StrictMode><Harness /></StrictMode>);
    const widget = screen.getByRole('textbox', { name: 'Widget state' });
    fireEvent.change(widget, { target: { value: 'edited' } });
    const observer = observers.at(-1)!;
    act(() => observer.resize(640.25));
    expect(screen.getByTestId('width').textContent).toBe('640.25');
    expect(screen.getByRole('textbox', { name: 'Widget state' })).toBe(widget);
    expect((widget as HTMLInputElement).value).toBe('edited');
    expect(JSON.parse(screen.getByTestId('layout').textContent!)).toEqual(saved);
    expect(JSON.parse(localStorage.getItem('test-grid')!)).toEqual(saved);
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('disconnects old containers and ignores queued measurements after detaching', () => {
    const view = render(<Harness />);
    const previous = observers[0];
    view.rerender(<Harness visible={false} />);
    expect(previous.disconnect).toHaveBeenCalledOnce();
    act(() => previous.resize(42));
    expect(screen.getByTestId('width').textContent).toBe('900.5');
    measuredWidth = 660.125;
    view.rerender(<Harness />);
    expect(screen.getByTestId('width').textContent).toBe('660.125');
    expect(observers).toHaveLength(2);
    view.unmount();
    expect(observers[1].disconnect).toHaveBeenCalledOnce();
  });

  it('measures immediately and cleans up its resize fallback without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = render(<Harness />);
    expect(screen.getByTestId('width').textContent).toBe('900.5');
    measuredWidth = 1080.75;
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('width').textContent).toBe('1080.75');
    view.unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
