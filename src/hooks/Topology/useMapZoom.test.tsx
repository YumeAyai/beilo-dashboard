// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useMapZoom } from './useMapZoom';

afterEach(cleanup);
it('uses the fitted transform as the gesture state, clamps scale and rejects invalid geometry', () => {
  const { result } = renderHook(() => useMapZoom({ minZoom: 0.2, maxZoom: 2 }));
  act(() => result.current.setTransform('translate(120, 80) scale(0.5)'));
  expect(result.current.zoom).toEqual({ x: 120, y: 80, scale: 0.5 });
  expect(result.current.transform).toBe('translate(120, 80) scale(0.5)');
  act(() => result.current.setTransform(previous => previous.replace('0.5', '10')));
  expect(result.current.zoom).toEqual({ x: 120, y: 80, scale: 2 });
  expect(result.current.transform).toBe('translate(120, 80) scale(2)');
  act(() => result.current.setTransform('translate(NaN, 0) scale(1)'));
  expect(result.current.zoom).toEqual({ x: 120, y: 80, scale: 2 });
});
