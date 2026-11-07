import { useRef, useState, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';

interface MapZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  onMapDrag?: (dragging: boolean) => void;
  shouldRecenter?: boolean;
}

interface MapZoomResult {
  ref: React.RefObject<SVGSVGElement | null>;
  transform: string;
  setTransform: React.Dispatch<React.SetStateAction<string>>;
  zoom: {
    x: number;
    y: number;
    scale: number;
  };
}

export function useMapZoom(options: MapZoomOptions = {}): MapZoomResult {
  const { minZoom = 0.1, maxZoom = 4, onMapDrag } = options;

  const ref = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0, scale: 1 });
  const memoRef = useRef({ x: 0, y: 0 });
  const transform = `translate(${zoom.x}, ${zoom.y}) scale(${zoom.scale})`;
  const setTransform = useCallback<React.Dispatch<React.SetStateAction<string>>>((next) => {
    setZoom(previous => {
      const current = `translate(${previous.x}, ${previous.y}) scale(${previous.scale})`;
      const value = typeof next === 'function' ? next(current) : next;
      const translation = value.match(/translate\(([^,]+),\s*([^)]+)\)/);
      const scaling = value.match(/scale\(([^)]+)\)/);
      if (!translation || !scaling) return previous;
      const x = Number(translation[1]), y = Number(translation[2]), scale = Number(scaling[1]);
      if (![x, y, scale].every(Number.isFinite)) return previous;
      const clamped = Math.min(Math.max(scale, minZoom), maxZoom);
      if (previous.x === x && previous.y === y && previous.scale === clamped) return previous;
      return { x, y, scale: clamped };
    });
  }, [minZoom, maxZoom]);

  const updateTransform = useCallback((x: number, y: number, scale: number) => {
    const clampedScale = Math.min(Math.max(scale, minZoom), maxZoom);
    setZoom({ x, y, scale: clampedScale });
  }, [minZoom, maxZoom]);

  useGesture(
    {
      onDrag: ({ movement: [mx, my], first, active }) => {
        onMapDrag?.(active);

        if (first) {
          memoRef.current = { x: zoom.x, y: zoom.y };
        }

        const newX = memoRef.current.x + mx;
        const newY = memoRef.current.y + my;
        updateTransform(newX, newY, zoom.scale);
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = (event as WheelEvent).clientX - rect.left;
        const mouseY = (event as WheelEvent).clientY - rect.top;

        const scaleFactor = dy > 0 ? 0.9 : 1.1;
        const newScale = zoom.scale * scaleFactor;
        const clampedScale = Math.min(Math.max(newScale, minZoom), maxZoom);

        const scaleChange = clampedScale / zoom.scale;
        const newX = mouseX - (mouseX - zoom.x) * scaleChange;
        const newY = mouseY - (mouseY - zoom.y) * scaleChange;

        updateTransform(newX, newY, clampedScale);
      },
      onPinch: ({ offset: [scale], origin: [ox, oy] }) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = ox - rect.left;
        const mouseY = oy - rect.top;

        const clampedScale = Math.min(Math.max(scale, minZoom), maxZoom);
        const scaleChange = clampedScale / zoom.scale;
        const newX = mouseX - (mouseX - zoom.x) * scaleChange;
        const newY = mouseY - (mouseY - zoom.y) * scaleChange;

        updateTransform(newX, newY, clampedScale);
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
      drag: { filterTaps: true },
      wheel: { eventOptions: { passive: false } },
      pinch: { scaleBounds: { min: minZoom, max: maxZoom } },
    }
  );

  return {
    ref,
    transform,
    setTransform,
    zoom,
  };
}

export function useFitView(
  containerRef: React.RefObject<HTMLElement | null>,
  contentBounds: { x: number; y: number; width: number; height: number } | null
) {
  const fitView = useCallback(() => {
    if (!containerRef.current || !contentBounds) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const padding = 0.2;
    const scaleX = containerWidth / (contentBounds.width * (1 + padding * 2));
    const scaleY = containerHeight / (contentBounds.height * (1 + padding * 2));
    const scale = Math.min(scaleX, scaleY, 1);

    const x = (containerWidth - contentBounds.width * scale) / 2 - contentBounds.x * scale;
    const y = (containerHeight - contentBounds.height * scale) / 2 - contentBounds.y * scale;

    return { x, y, scale };
  }, [containerRef, contentBounds]);

  return { fitView };
}
