import { useCallback, useRef } from 'react';
import type { Point } from '@netx/sdk';
import type { CanvasState } from '../canvas-engine.js';
import type { StoreApi } from 'zustand';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.001;

export function usePanZoom(store: StoreApi<CanvasState>) {
  const panning = useRef<{ startOffset: Point; startMouse: Point } | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const { viewport } = store.getState();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * (1 + delta)));

    // Zoom toward cursor position
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const scale = newZoom / viewport.zoom;
    const newOffset = {
      x: cursorX - scale * (cursorX - viewport.offset.x),
      y: cursorY - scale * (cursorY - viewport.offset.y),
    };

    store.setState({ viewport: { offset: newOffset, zoom: newZoom } });
  }, [store]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Middle mouse button or space+click for panning
    if (e.button === 1) {
      e.preventDefault();
      const { viewport } = store.getState();
      panning.current = {
        startOffset: { ...viewport.offset },
        startMouse: { x: e.clientX, y: e.clientY },
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  }, [store]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panning.current) return;

    const { startOffset, startMouse } = panning.current;
    store.setState({
      viewport: {
        ...store.getState().viewport,
        offset: {
          x: startOffset.x + (e.clientX - startMouse.x),
          y: startOffset.y + (e.clientY - startMouse.y),
        },
      },
    });
  }, [store]);

  const onPointerUp = useCallback(() => {
    panning.current = null;
  }, []);

  return { onWheel, onPointerDown, onPointerMove, onPointerUp };
}
