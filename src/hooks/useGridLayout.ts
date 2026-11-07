import { useState, useCallback } from 'react';
import type { Layout } from 'react-grid-layout/legacy';

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface UseGridLayoutOptions {
  storageKey: string;
  defaultLayout: LayoutItem[];
  previousDefaultLayout?: LayoutItem[];
  widgets: Record<string, string>;
}

// RGL compacts an initial top offset and may reorder items before saving.
function matchesDefaultLayout(layout: LayoutItem[], defaults: LayoutItem[]) {
  if (layout.length !== defaults.length) return false;
  const top = Math.min(...layout.map(item => item.y));
  const defaultTop = Math.min(...defaults.map(item => item.y));
  return defaults.every(expected => {
    const item = layout.find(candidate => candidate.i === expected.i);
    return item && item.x === expected.x && item.y - top === expected.y - defaultTop
      && item.w === expected.w && item.h === expected.h;
  });
}

export function useGridLayout({ storageKey, defaultLayout, previousDefaultLayout, widgets }: UseGridLayoutOptions) {
  const [containerWidth, setContainerWidth] = useState(0);

  const loadLayout = useCallback((): LayoutItem[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const widgetIds = Object.values(widgets);
        const hasAllWidgets = widgetIds.every((id) =>
          parsed.some((item: LayoutItem) => item.i === id)
        );
        if (hasAllWidgets) {
          return previousDefaultLayout && matchesDefaultLayout(parsed, previousDefaultLayout)
            ? defaultLayout : parsed;
        }
      }
    } catch {
      // ignore errors
    }
    return defaultLayout;
  }, [storageKey, defaultLayout, previousDefaultLayout, widgets]);

  const saveLayout = useCallback(
    (layout: LayoutItem[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(layout));
      } catch {
        // ignore errors
      }
    },
    [storageKey]
  );

  const [layout, setLayout] = useState<LayoutItem[]>(loadLayout);

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const typedLayout = [...newLayout] as LayoutItem[];
      // Only update if layout actually changed to prevent unnecessary re-renders
      setLayout(prev => {
        if (JSON.stringify(prev) === JSON.stringify(typedLayout)) {
          return prev;
        }
        saveLayout(typedLayout);
        return typedLayout;
      });
    },
    [saveLayout]
  );

  // The grid is mounted only after data loads. A callback ref observes the
  // actual element when it appears, including later remounts and parent resizes.
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    let active = true;
    const updateWidth = (width: number) => {
      if (active && Number.isFinite(width) && width >= 0) {
        setContainerWidth(previous => previous === width ? previous : width);
      }
    };
    const measure = () => {
      const style = getComputedStyle(node);
      const horizontalInset = [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
        .reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
      updateWidth(Math.max(0, node.getBoundingClientRect().width - horizontalInset));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(entries => {
        const entry = entries.find(item => item.target === node);
        if (entry) updateWidth(entry.contentRect.width);
      });
      observer.observe(node);
      return () => { active = false; observer.disconnect(); };
    }
    window.addEventListener('resize', measure);
    return () => { active = false; window.removeEventListener('resize', measure); };
  }, []);

  return { layout, handleLayoutChange, containerWidth, containerRef };
}
