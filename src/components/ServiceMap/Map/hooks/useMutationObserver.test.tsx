// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createMutationObserver, useMutationObserver } from './useMutationObserver';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Observer({ callback, visible = true, nodeKey = 'a' }: { callback: () => void; visible?: boolean; nodeKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useMutationObserver({ ref, options: { childList: true } }, callback);
  return visible ? <div ref={ref} key={nodeKey} data-testid="target" /> : null;
}

it('keeps one observer, delivers the latest callback and disconnects on unmount', async () => {
  const first = vi.fn();
  const latest = vi.fn();
  const observe = vi.spyOn(MutationObserver.prototype, 'observe');
  const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
  const view = render(<Observer callback={first} />);
  view.rerender(<Observer callback={latest} />);
  expect(observe).toHaveBeenCalledTimes(1);
  await act(async () => { view.getByTestId('target').append(document.createElement('span')); });
  expect(first).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
});

it('observes a ref that appears after loading and replaces it when the DOM node changes', async () => {
  const callback = vi.fn();
  const view = render(<Observer callback={callback} visible={false} />);
  view.rerender(<Observer callback={callback} />);
  const old = view.getByTestId('target');
  view.rerender(<Observer callback={callback} nodeKey="b" />);
  await act(async () => { old.append(document.createElement('span')); });
  expect(callback).not.toHaveBeenCalled();
  await act(async () => { view.getByTestId('target').append(document.createElement('span')); });
  expect(callback).toHaveBeenCalledTimes(1);
});

it('does not construct an observer for a missing target', () => {
  const observe = vi.spyOn(MutationObserver.prototype, 'observe');
  expect(createMutationObserver({ elem: '#missing' }, vi.fn())).toBeNull();
  expect(observe).not.toHaveBeenCalled();
});
