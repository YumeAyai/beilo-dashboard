import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { ServiceMapArrow } from '../service-map/arrow-core';
import { colors, sizes } from '../domain/sizes';
import * as helpers from './helpers';

interface ServiceMapArrowBodyProps {
  arrow: ServiceMapArrow;
}

export const ServiceMapArrowBody: React.FC<ServiceMapArrowBodyProps> = ({ arrow }) => {
  const trajectoryGroup = useRef<SVGGElement | null>(null);
  const handlesGroup = useRef<SVGGElement | null>(null);
  const endingFigures = useRef<SVGGElement | null>(null);

  const renderArrow = useCallback(() => {
    if (!trajectoryGroup.current) return;

    const target = d3.select(trajectoryGroup.current);

    // d3 General Update Pattern for arrow path
    const path = target
      .selectAll<SVGPathElement, ServiceMapArrow>('path.line')
      .data([arrow], d => d.id);

    path
      .attr('d', d => helpers.svg.arrowLinePath(d.points))
      .attr('stroke', colors.arrowStroke);

    path
      .enter()
      .append('path')
      .attr('class', 'line')
      .attr('stroke', colors.arrowStroke)
      .attr('stroke-width', sizes.linkWidth)
      .attr('fill', 'none')
      .attr('d', d => helpers.svg.arrowLinePath(d.points))
      .merge(path);

    path.exit().remove();
  }, [arrow]);

  const renderHandles = useCallback(() => {
    if (!handlesGroup.current) return;

    const handles = helpers.collectHandles(arrow);
    const target = d3.select(handlesGroup.current);

    const paths = target
      .selectAll<SVGPathElement, helpers.ArrowHandle>('path.handle')
      .data(handles, (h, i) => {
        const [from, to] = h;
        return `${arrow.id}-${i}-${from.x},${from.y}-${to.x},${to.y}`;
      });

    paths.attr('d', helpers.svg.arrowHandlePath);

    paths
      .enter()
      .append('path')
      .attr('class', 'handle')
      .attr('fill', colors.arrowHandle)
      .attr('stroke', 'none')
      .attr('d', helpers.svg.arrowHandlePath)
      .merge(paths);

    paths.exit().remove();
  }, [arrow]);

  const renderStartPlate = useCallback(() => {
    if (!endingFigures.current || !arrow.start) return;

    const target = d3.select(endingFigures.current);

    const startPlate = target
      .selectAll<SVGPathElement, { x: number; y: number }>('path.start-plate')
      .data([arrow.start], () => `${arrow.id}-start-plate`);

    startPlate.attr('d', helpers.svg.startPlatePath);

    startPlate
      .enter()
      .append('path')
      .attr('class', 'start-plate')
      .attr('fill', colors.startPlateFill)
      .attr('stroke', colors.startPlateStroke)
      .attr('stroke-width', sizes.linkWidth)
      .attr('d', helpers.svg.startPlatePath)
      .merge(startPlate);

    startPlate.exit().remove();
  }, [arrow]);

  useEffect(() => {
    renderArrow();
  }, [renderArrow]);

  useEffect(() => {
    renderHandles();
  }, [renderHandles]);

  useEffect(() => {
    renderStartPlate();
  }, [renderStartPlate]);

  return (
    <g className={`arrow-body ${arrow.id}`}>
      <g className="trajectory" ref={trajectoryGroup}></g>
      <g className="triangle-handles" ref={handlesGroup}></g>
      <g className="ending-figures" ref={endingFigures}></g>
    </g>
  );
};
