// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createTheme, ThemeProvider } from '@mui/material';
import i18n from '../../i18n';
import { TopologyWorkspace } from './TopologyWorkspace';
import { FlowsTable } from './FlowsTable';

afterEach(async () => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); await i18n.changeLanguage('zh-CN'); });

it('resizes only the overlay without rerendering or remounting the map and table', () => {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 200 } as DOMRect);
  const mapRender = vi.fn();
  const tableRender = vi.fn();
  function Map() { mapRender(); return <svg data-testid="map" />; }
  function Table() { tableRender(); return <div>Flows</div>; }
  render(<TopologyWorkspace canvas={<Map />}><Table /></TopologyWorkspace>);
  const workspace = screen.getByTestId('topology-workspace');
  const panel = screen.getByTestId('topology-flow-panel');
  const map = screen.getByTestId('map');
  const handle = screen.getByRole('separator');
  Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
  expect(getComputedStyle(panel).position).toBe('absolute');
  expect(getComputedStyle(panel).bottom).toBe('0px');
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 500 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });
  expect(workspace.style.getPropertyValue('--topology-panel-height')).toBe('400px');
  fireEvent.pointerCancel(handle, { pointerId: 1 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 200 });
  expect(workspace.style.getPropertyValue('--topology-panel-height')).toBe('400px');
  expect(screen.getByTestId('map')).toBe(map);
  expect(mapRender).toHaveBeenCalledTimes(1);
  expect(tableRender).toHaveBeenCalledTimes(1);
});

it('uses a dark column header when the application is in dark mode', () => {
  render(<ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
    <FlowsTable flows={[]} />
  </ThemeProvider>);
  expect(getComputedStyle(screen.getByTestId('flow-column-headers')).backgroundColor).toBe('rgb(23, 38, 61)');
});

it.each([
  ['zh-CN', '正在加载数据流…'],
  ['zh-TW', '正在載入資料流…'],
  ['en-US', 'Loading flows…'],
  ['ja-JP', 'フローを読み込み中…'],
])('translates the flow loading state in %s', async (language, text) => {
  await i18n.changeLanguage(language);
  render(<FlowsTable flows={[]} loading />);
  expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByText('topology.loadingFlows')).toBeNull();
});
