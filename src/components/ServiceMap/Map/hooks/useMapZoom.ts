import * as d3 from 'd3';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

export interface MapZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UseMapZoomOptions {
  minScale?: number;
  maxScale?: number;
  onMapDrag?: (dragged: boolean) => void;
}

export function useMapZoom({ minScale = 0.1, maxScale = 1.5, onMapDrag }: UseMapZoomOptions = {}) {
  const [transform, setTransform] = useState('translate(0, 0) scale(1)');
  const [state, setState] = useState<MapZoomState>({ scale: 1, translateX: 0, translateY: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const notifyDrag = useEffectEvent((dragged: boolean) => onMapDrag?.(dragged));
  const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>()
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      const { x, y, k } = event.transform;
      setTransform(`translate(${x}, ${y}) scale(${k})`);
      setState({ scale: k, translateX: x, translateY: y });
    }), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    zoom.scaleExtent([minScale, maxScale])
      .on('start', () => notifyDrag(true))
      .on('end', () => notifyDrag(false));
    d3.select(svg).call(zoom);
    return () => { d3.select(svg).on('.zoom', null); };
  }, [zoom, minScale, maxScale]);

  return { ref: svgRef, transform, setTransform, scale: state.scale, state, zoom };
}
