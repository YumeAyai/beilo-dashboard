import { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { useTheme } from '@mui/material';

export interface QpsDataPoint {
  time: number | string;
  qps: number;
}

interface Props {
  data: QpsDataPoint[];
  width?: number | string;
  height?: number;
}

export function QpsHistogram({ data, width = '100%', height = 120 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const svgNode = svgRef.current;
    const containerWidth = svgNode.clientWidth || 400;

    const margin = { top: 8, right: 8, bottom: 20, left: 40 };
    const innerWidth = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Colors
    const gridColor = isDark ? '#333333' : '#e0e0e0';
    const textColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
    const barColor = isDark ? '#69B4FF' : '#1976d2';

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.15);

    const maxQps = d3.max(data, d => d.qps) || 100;
    const yScale = d3.scaleLinear()
      .domain([0, Math.ceil(maxQps / 20) * 20])
      .range([innerHeight, 0])
      .nice();

    // Draw grid lines
    const yTicks = yScale.ticks(4);
    g.selectAll('.grid-line')
      .data(yTicks)
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '2,2');

    // Draw Y axis labels
    g.selectAll('.y-label')
      .data(yTicks)
      .join('text')
      .attr('class', 'y-label')
      .attr('x', -6)
      .attr('y', d => yScale(d))
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', textColor)
      .attr('font-size', '10px')
      .text(d => d);

    // Draw X axis labels (show first, middle, last)
    const xLabels = [0, Math.floor(data.length / 2), data.length - 1];
    const formatTime = (t: number | string): string => {
      const d = typeof t === 'string' && /^\d+$/.test(t) ? new Date(parseInt(t) > 1e12 ? parseInt(t) : parseInt(t) * 1000)
        : typeof t === 'number' ? new Date(t > 1e12 ? t : t * 1000)
        : new Date(t);
      return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    xLabels.forEach(idx => {
      g.append('text')
        .attr('x', (xScale(idx.toString()) ?? 0) + xScale.bandwidth() / 2)
        .attr('y', innerHeight + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', textColor)
        .attr('font-size', '10px')
        .text(formatTime(data[idx]?.time ?? ''));
    });

    // Bars with animation
    const bars = g.selectAll<SVGRectElement, QpsDataPoint>('rect.bar')
      .data(data, (_, i) => i.toString());

    // Exit - slide left and fade out
    bars.exit()
      .transition()
      .duration(400)
      .ease(d3.easeLinear)
      .attr('x', -xScale.bandwidth())
      .attr('opacity', 0)
      .remove();

    // Enter - start from right with opacity 0
    const enterBars = bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', innerWidth)
      .attr('y', innerHeight)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', barColor)
      .attr('rx', 1)
      .attr('opacity', 0);

    // Enter + Update merge - animate to final position
    enterBars.merge(bars)
      .transition()
      .duration(400)
      .ease(d3.easeLinear)
      .attr('x', (_, i) => xScale(i.toString()) ?? 0)
      .attr('y', d => yScale(d.qps))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.qps))
      .attr('fill', barColor)
      .attr('opacity', 1);

  }, [data, height, isDark]);

  return (
    <Box sx={{ width, height, overflow: 'hidden', bgcolor: isDark ? '#181818' : '#ffffff', borderRadius: 1 }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        style={{ display: 'block' }}
      />
    </Box>
  );
}
