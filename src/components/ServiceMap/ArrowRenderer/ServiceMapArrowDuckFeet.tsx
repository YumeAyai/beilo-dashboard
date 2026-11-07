import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { AccessPointArrow } from '../service-map/arrow-core';
import { colors, sizes } from '../domain/sizes';

interface ServiceMapArrowDuckFeetProps {
  connectorId: string;
  arrows: Map<string, AccessPointArrow>;
  arrowsForeground?: HTMLElement | null;
}

export const ServiceMapArrowDuckFeet: React.FC<ServiceMapArrowDuckFeetProps> = ({
  connectorId,
  arrows,
}) => {
  const connectorCapRef = useRef<SVGGElement | null>(null);
  const innerArrowsRef = useRef<SVGGElement | null>(null);

  const arrowsArray = Array.from(arrows.values());

  const renderConnectorCap = useCallback(() => {
    if (!connectorCapRef.current) return;

    const connectorPosition = arrowsArray[0]?.start;
    if (!connectorPosition) return;

    const target = d3.select(connectorCapRef.current);

    const endingConnector = target
      .selectAll<SVGCircleElement, { x: number; y: number }>('circle.ending-connector')
      .data([connectorPosition], () => `${connectorId}-ending-connector`);

    endingConnector
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    endingConnector
      .enter()
      .append('circle')
      .attr('class', 'ending-connector')
      .attr('fill', colors.connectorFill)
      .attr('stroke', colors.connectorStroke)
      .attr('stroke-width', sizes.connectorWidth)
      .attr('r', 7.5)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .merge(endingConnector);

    endingConnector.exit().remove();
  }, [arrowsArray, connectorId]);

  const renderInnerArrows = useCallback(() => {
    if (!innerArrowsRef.current) return;

    const apArrows = arrowsArray;
    const innerArrowsElem = innerArrowsRef.current;

    // Background lines
    const backgroundLines = d3
      .select(innerArrowsElem)
      .selectAll<SVGLineElement, AccessPointArrow>('line.outer-inner-line')
      .data(apArrows, arr => `outer-${arr.id}-${Array.from(arr.verdicts).join(',')}`);

    backgroundLines
      .attr('x1', d => d.start?.x || 0)
      .attr('y1', d => d.start?.y || 0)
      .attr('x2', d => d.end?.x || 0)
      .attr('y2', d => d.end?.y || 0);

    backgroundLines
      .enter()
      .append('line')
      .attr('class', 'outer-inner-line')
      .attr('stroke', colors.feetOuterStroke)
      .attr('stroke-width', d => d.hasAbnormalVerdict ? sizes.feetInnerWidthThick + 2 : sizes.feetInnerWidth + 2)
      .attr('x1', d => d.start?.x || 0)
      .attr('y1', d => d.start?.y || 0)
      .attr('x2', d => d.end?.x || 0)
      .attr('y2', d => d.end?.y || 0)
      .merge(backgroundLines);

    backgroundLines.exit().remove();

    // Foreground lines
    const foregroundLines = d3
      .select(innerArrowsElem)
      .selectAll<SVGLineElement, AccessPointArrow>('line.inner')
      .data(apArrows, arr => `inner-${arr.id}-${Array.from(arr.verdicts).join(',')}`);

    foregroundLines
      .attr('x1', d => d.start?.x || 0)
      .attr('y1', d => d.start?.y || 0)
      .attr('x2', d => d.end?.x || 0)
      .attr('y2', d => d.end?.y || 0)
      .attr('stroke', d => d.hasAbnormalVerdict ? colors.feetRedStroke : colors.feetNeutralStroke)
      .attr('stroke-width', d => d.hasAbnormalVerdict ? sizes.feetInnerWidthThick : sizes.feetInnerWidth)
      .attr('stroke-dasharray', d => {
        if (d.verdicts.size > 1 && d.hasAbnormalVerdict) {
          return '7 15';
        }
        return null;
      });

    foregroundLines
      .enter()
      .append('line')
      .attr('class', 'inner')
      .attr('stroke-linecap', 'round')
      .attr('x1', d => d.start?.x || 0)
      .attr('y1', d => d.start?.y || 0)
      .attr('x2', d => d.end?.x || 0)
      .attr('y2', d => d.end?.y || 0)
      .attr('stroke', d => d.hasAbnormalVerdict ? colors.feetRedStroke : colors.feetNeutralStroke)
      .attr('stroke-width', d => d.hasAbnormalVerdict ? sizes.feetInnerWidthThick : sizes.feetInnerWidth)
      .attr('stroke-dasharray', d => {
        if (d.verdicts.size > 1 && d.hasAbnormalVerdict) {
          return '7 15';
        }
        return null;
      })
      .merge(foregroundLines);

    foregroundLines.exit().remove();

    // Padlock icons for mTLS
    const padlocks = d3
      .select(innerArrowsElem)
      .selectAll<SVGImageElement, AccessPointArrow>('image.padlock')
      .data(apArrows.filter(a => a.isEncrypted), arr => `padlock-${arr.id}`);

    padlocks
      .attr('x', d => (d.end?.x || 0) - 8)
      .attr('y', d => (d.end?.y || 0) - 20);

    padlocks
      .enter()
      .append('image')
      .attr('class', 'padlock')
      .attr('href', `${import.meta.env.BASE_URL}hubble/icons/blueprint/16px/lock.svg`)
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', d => (d.end?.x || 0) - 8)
      .attr('y', d => (d.end?.y || 0) - 20)
      .merge(padlocks);

    padlocks.exit().remove();
  }, [arrowsArray]);

  useEffect(() => {
    renderConnectorCap();
  }, [renderConnectorCap]);

  useEffect(() => {
    renderInnerArrows();
  }, [renderInnerArrows]);

  return (
    <g className={`arrow-duckfeet ${connectorId}`}>
      <g className="arrows-to-access-points" ref={innerArrowsRef}></g>
      <g className="connector-cap" ref={connectorCapRef}></g>
    </g>
  );
};
