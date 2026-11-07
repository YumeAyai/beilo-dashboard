// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import * as echarts from 'echarts';
import i18n from '../../i18n';
import world from '../../../public/world.json';
import { RequestAttributionMap, type AttributionEntry } from './RequestAttributionMap';

type MapSeries = { type: string; name: string; data: Array<{ name?: string; value?: number | number[]; coords?: number[][] }> };
interface ChartProps {
  option: { series?: MapSeries[]; tooltip?: { formatter(params: unknown): string } };
  onEvents?: Record<string, (event: { type: string; zoom?: number }) => void>;
  onChartReady?: (chart: echarts.EChartsType) => void;
}
const captured = vi.hoisted(() => ({ option: {} as ChartProps['option'], props: {} as ChartProps }));
vi.mock('echarts-for-react', () => ({ default: (props: ChartProps) => { captured.option = props.option; captured.props = props; return null; } }));
beforeEach(async () => {
  captured.option = {};
  // SVG geometry tests use ZRender's text-width fallback, not a canvas backend.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => world })));
  await i18n.changeLanguage('en-US');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const unknown: AttributionEntry = { ip: '127.0.0.1', country: '', countryCode: '', city: '', requestCount: 7, threatCount: 0, lat: 0, lng: 0 };
async function renderMap(data: AttributionEntry[]) {
  render(<I18nextProvider i18n={i18n}><RequestAttributionMap data={data} wafLocations={[{ id: 'private-waf', country: 'Private Network', countryCode: '', city: '', lat: 0, lng: 0, requests: 7, threats: 0, blocked: 0 }]} /></I18nextProvider>);
  await waitFor(() => expect(captured.option.series?.length).toBeGreaterThan(0));
  return captured.option.series!;
}

describe('geographic attribution', () => {
  it('keeps country geometry, anchors and route endpoints aligned through zoom, drag, refresh and resize', async () => {
    let sourcePoint = [69.2, 34.5];
    let targetPoint = [0, 0];
    const sources = [0, 5, 20].map((threatCount, index) => ({ ...unknown, ip: `8.8.8.${index + 1}`, country: 'Afghanistan', countryCode: 'AF', requestCount: 100, threatCount, lat: sourcePoint[1], lng: sourcePoint[0] }));
    const target = { id: 'private-waf', country: 'Private Network', countryCode: '', city: '', lat: targetPoint[1], lng: targetPoint[0], requests: 300, threats: 25, blocked: 0 };
    const renderChart = () => <I18nextProvider i18n={i18n}><RequestAttributionMap data={sources.map(source => ({ ...source, lat: sourcePoint[1], lng: sourcePoint[0] }))} wafLocations={[{ ...target, lat: targetPoint[1], lng: targetPoint[0] }]} /></I18nextProvider>;
    const view = render(renderChart());
    await waitFor(() => expect(captured.option.series?.length).toBeGreaterThan(0));
    const chart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: 600, height: 300 });
    type Geo = { dataToPoint(point: number[]): number[]; getTransformInfo(): { roam: { x: number; y: number; scaleX: number; scaleY: number } } };
    type Data = { count(): number; getItemLayout(index: number): number[] | number[][]; getItemGraphicEl(index: number): { x: number; y: number } };
    type Series = { name: string; subType: string; coordinateSystem: Geo; getData(): Data };
    type GeoModel = { coordinateSystem: Geo };
    type Draw = { _controller: { trigger(type: string, event: object): void }; _transformGroup: { x: number; y: number; scaleX: number; scaleY: number } };
    const internals = chart as unknown as {
      getModel(): { getComponent(type: string): GeoModel; eachSeries(callback: (series: Series) => void): void };
      getViewOfComponentModel(model: GeoModel): { _mapDraw: Draw };
    };
    const applyOption = () => chart.setOption({ ...captured.option, series: captured.option.series!.map(series => ({ ...series, effect: { show: false } })) });
    try {
      applyOption();
      captured.props.onChartReady?.(chart);
      chart.on('georoam', event => captured.props.onEvents?.georoam?.(event as { type: string; zoom?: number }));
      const setOption = vi.spyOn(chart, 'setOption');
      const verifyAlignment = () => {
        const model = internals.getModel();
        const geoModel = model.getComponent('geo');
        const geo = geoModel.coordinateSystem;
        const draw = internals.getViewOfComponentModel(geoModel)._mapDraw;
        const expected = geo.getTransformInfo().roam;
        for (const key of ['x', 'y', 'scaleX', 'scaleY'] as const) expect(draw._transformGroup[key]).toBeCloseTo(expected[key]);
        model.eachSeries(series => {
          expect(series.coordinateSystem).toBe(geo);
          const data = series.getData();
          if (!data.count()) return;
          if (series.subType === 'scatter') {
            const point = geo.dataToPoint(series.name === 'WAF' ? targetPoint : sourcePoint);
            const symbol = data.getItemGraphicEl(0);
            expect(symbol.x).toBeCloseTo(point[0]);
            expect(symbol.y).toBeCloseTo(point[1]);
          }
          if (series.subType === 'lines') {
            const ends = data.getItemLayout(0) as number[][];
            expect(ends[0]).toEqual(geo.dataToPoint(sourcePoint));
            expect(ends[1]).toEqual(geo.dataToPoint(targetPoint));
          }
        });
        return draw;
      };
      for (let i = 0; i < 3; i++) {
        verifyAlignment()._controller.trigger('zoom', { scale: 1.2, originX: 300, originY: 150 });
        verifyAlignment()._controller.trigger('pan', { dx: 43, dy: -17 });
        verifyAlignment();
      }
      // Roaming already updates all geo series; a nested setOption starts an
      // unrelated render/animation cycle while the pointer is still moving.
      expect(setOption).not.toHaveBeenCalled();
      sourcePoint = [116.4, 39.9];
      targetPoint = [103.8, 1.3];
      view.rerender(renderChart());
      applyOption();
      verifyAlignment();
      verifyAlignment()._controller.trigger('pan', { dx: -60, dy: 29 });
      verifyAlignment();
      chart.resize({ width: 800, height: 400 });
      verifyAlignment();
    } finally { chart.dispose(); }
  });

  it('keeps unknown local traffic in the summary without joining it to unnamed map regions', async () => {
    const series = await renderMap([unknown]);
    expect(screen.getByText('Unknown location')).toBeTruthy();
    expect(screen.queryByText('7 requests have no coordinates and are not plotted.')).toBeNull();
    expect(series[0].data).toEqual([]);
    for (const layer of series.filter(s => (s.type === 'scatter' && s.name !== 'WAF') || s.type === 'lines')) expect(layer.data).toEqual([]);
    expect(series.find(layer => layer.name === 'WAF')?.data[0].value).toEqual([0, 0]);
    // The shipped map contains two empty names near Kashmir. Verify against
    // ECharts' actual geographic join that neither receives the unknown count.
    const chart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: 600, height: 300 });
    try {
      chart.setOption({ animation: false, series: [{ type: 'map', map: 'world', data: series[0].data }] });
      const model = (chart as unknown as { getModel(): { getSeriesByIndex(index: number): { getData(): { each(fn: (index: number) => void): void; getName(index: number): string; get(dimension: string, index: number): number } } } }).getModel();
      const data = model.getSeriesByIndex(0).getData();
      let unnamed = 0;
      data.each(i => { if (data.getName(i) === '') { unnamed++; expect(Number.isNaN(data.get('value', i))).toBe(true); } });
      expect(unnamed).toBeGreaterThan(0);
    } finally { chart.dispose(); }
  });

  it.each([
    ['127.0.0.1', 'loopback', 'Loopback'],
    ['192.168.1.3', 'private', 'Private address'],
    ['fd00::1', 'private', 'Private address'],
    ['fe80::1', 'link_local', 'Link-local'],
    ['100.64.0.1', 'shared', 'Shared address'],
  ] as const)('labels %s by address category without calling it an unknown country', async (ip, addressType, label) => {
    const series = await renderMap([{ ...unknown, ip, addressType }]);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByTitle(`${label} · ${ip}`)).toBeTruthy();
    expect(screen.queryByText('Unknown location')).toBeNull();
    expect(series[0].data).toEqual([]);
  });

  it('retains correctly located Afghan traffic and connects it to the original local WAF anchor', async () => {
    const series = await renderMap([{ ...unknown, country: 'Afghanistan', countryCode: 'af', lat: 34.5, lng: 69.2, requestCount: 3 }]);
    expect(series[0].data).toEqual([{ name: 'Afghanistan', value: 3, threatCount: 0 }]);
    expect(series.find(s => s.name === 'Normal' && s.type === 'scatter')?.data[0].value).toEqual([69.2, 34.5, 3, 0]);
    expect(series.find(layer => layer.type === 'lines' && layer.name === 'Normal')?.data).toEqual([{ coords: [[69.2, 34.5], [0, 0]] }]);
  });

  it('keeps the original country bubble with requests, threats and rate even for an empty country series', async () => {
    await renderMap([unknown]);
    const format = captured.option.tooltip!.formatter;
    const empty = format({ seriesType: 'map', data: { name: 'Afghanistan' } });
    expect(empty).toContain('Afghanistan');
    expect(empty).toContain('Requests: 0');
    expect(empty).toContain('Threats:');
    expect(empty).toContain('Threat Rate:');
    expect(empty).not.toContain('No geolocated traffic observed');
    const observed = format({ seriesType: 'map', data: { name: 'Afghanistan', value: 10, threatCount: 2 } });
    expect(observed).toContain('Requests: 10');
    expect(observed).toContain('20.00%');
    expect(format({ seriesType: 'lines' })).toBe('');
  });
});
