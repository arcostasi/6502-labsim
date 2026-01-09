
import React, { useState, useRef, useCallback } from 'react';

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export interface UsePanZoomReturn {
  view: ViewState;
  isDragging: React.MutableRefObject<boolean>;
  handleWheel: (e: React.WheelEvent | WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent | MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent | MouseEvent) => void;
  handleMouseUp: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const DEFAULT_VIEW: ViewState = { x: 160, y: 55, scale: 0.7 };
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.1;

// Interactive elements that should block pan-drag initiation
const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a, label, [role="button"], [role="slider"]';

export function usePanZoom(
  initialView: ViewState = DEFAULT_VIEW,
  viewportEl: HTMLElement | null = null,
): UsePanZoomReturn {
  const [view, setView] = useState<ViewState>(initialView);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Zoom toward the cursor position for a more natural feel.
  // Uses a functional setView update so view.scale is NOT in the dependency array,
  // preventing the listener from being re-registered on every zoom step.
  const handleWheel = useCallback((e: React.WheelEvent | WheelEvent) => {
    const scaleAmount = -e.deltaY * 0.001;
    setView(prev => {
      const newScale = Math.min(Math.max(prev.scale + scaleAmount, MIN_SCALE), MAX_SCALE);
      if (!viewportEl) return { ...prev, scale: newScale };

      const rect = viewportEl.getBoundingClientRect();
      // Mouse position relative to viewport center (the transform-origin)
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      // World-space point currently under the cursor
      const worldX = (mouseX - prev.x) / prev.scale;
      const worldY = (mouseY - prev.y) / prev.scale;
      // Translate so the same world point stays under the cursor after scale changes
      return {
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
        scale: newScale,
      };
    });
  }, [viewportEl]);

  const handleMouseDown = useCallback((e: React.MouseEvent | MouseEvent) => {
    const target = e.target as HTMLElement;
    // Block drag initiation when clicking inside a visualizer panel or any interactive control
    if (
      target.closest('.visualizer-panel') ||
      target.closest(INTERACTIVE_SELECTOR)
    ) {
      return;
    }

    if (e.button === 0) {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const resetView = useCallback(() => {
    setView(DEFAULT_VIEW);
  }, []);

  const zoomIn = useCallback(() => {
    setView(v => ({ ...v, scale: Math.min(v.scale + ZOOM_STEP, MAX_SCALE) }));
  }, []);

  const zoomOut = useCallback(() => {
    setView(v => ({ ...v, scale: Math.max(v.scale - ZOOM_STEP, MIN_SCALE) }));
  }, []);

  return {
    view,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetView,
    zoomIn,
    zoomOut,
  };
}
