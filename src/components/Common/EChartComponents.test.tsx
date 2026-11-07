// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as echarts from 'echarts';
import { ENightingaleChart, EPieChart } from './EChartComponents';

const captured = vi.hoisted(() => ({ option: {} as echarts.EChartsOption }));
vi.mock('echarts-for-react', () => ({ default: ({ option }: { option: echarts.EChartsOption }) => { captured.option = option; return null; } }));
afterEach(cleanup);
// jsdom has no canvas text metrics. Text width does not affect pie sector
// angles; keep the real ECharts layout and provide only its measurement hook.
echarts.setPlatformAPI({ measureText: text => ({ width: text.length * 8 }) });

function sliceAngles(values: number[]) {
  const data = values.map((value, i) => ({ name: String(i), value, color: '#2185d0' }));
  render(<ENightingaleChart outerData={data} innerData={data} outerName="WAF" innerName="Origin" />);
  const chart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: 200, height: 200 });
  try {
    chart.setOption({ ...captured.option, animation: false });
    // Keep the real rose layout: positive categories have equal angles and
    // different radii, while a zero count must not reserve an empty sector.
    const model = (chart as unknown as { getModel(): { getSeriesByIndex(index: number): { getData(): { count(): number; getItemLayout(index: number): { angle: number; r: number; r0: number } } } } }).getModel();
    return [0, 1].map(series => {
      const data = model.getSeriesByIndex(series).getData();
      return Array.from({ length: data.count() }, (_, i) => data.getItemLayout(i));
    });
  } finally { chart.dispose(); }
}

describe('nested equal-angle rose charts', () => {
  it('does not reserve half the circle for a zero-valued category', () => {
    for (const ring of sliceAngles([100, 0])) {
      expect(ring).toHaveLength(1);
      expect(ring[0].angle).toBeCloseTo(2 * Math.PI);
    }
  });
  it('preserves equal angles and value-dependent radii for nonzero categories', () => {
    for (const ring of sliceAngles([90, 10])) {
      expect(ring).toHaveLength(2);
      expect(ring[0].angle).toBeCloseTo(Math.PI);
      expect(ring[1].angle).toBeCloseTo(Math.PI);
      expect(ring[0].r).toBeGreaterThan(ring[1].r);
      expect(ring[1].r).toBeGreaterThan(ring[1].r0);
    }
  });
  it('leaves a zero-total source empty instead of inventing sectors', () => {
    for (const ring of sliceAngles([0, 0])) expect(ring).toEqual([]);
  });
});

it('lets ECharts assign the light-mode blue and cyan first while preserving an explicit semantic color', () => {
  render(<EPieChart data={[{ name: 'A', value: 3 }, { name: 'B', value: 2 }, { name: 'Blocked', value: 1, color: '#D95C5C' }]} />);
  const chart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: 240, height: 200 });
  try {
    chart.setOption({ ...captured.option, animation: false });
    const model = (chart as unknown as { getModel(): { getSeriesByIndex(index: number): { getData(): { getItemVisual(index: number, key: string): { fill: string } } } } }).getModel();
    const data = model.getSeriesByIndex(0).getData();
    expect([0, 1, 2].map(i => data.getItemVisual(i, 'style').fill)).toEqual(['#69B4FF', '#65CFDC', '#D95C5C']);
  } finally { chart.dispose(); }
});
