import { useCallback, useRef } from 'react';
import type { ID, Point } from '@netx/sdk';
import type { CanvasState } from '../canvas-engine.js';
import type { StoreApi } from 'zustand';

export function useDrag(store: StoreApi<CanvasState>) {
  const dragging = useRef<{ id: ID; startPos: Point; startMouse: Point } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, deviceId: ID) => {
    e.stopPropagation();
    const device = store.getState().devices.get(deviceId);
    if (!device) return;

    dragging.current = {
      id: deviceId,
      startPos: { ...device.position },
      startMouse: { x: e.clientX, y: e.clientY },
    };

    (e.target as Element).setPointerCapture(e.pointerId);
  }, [store]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;

    const { id, startPos, startMouse } = dragging.current;
    const { zoom } = store.getState().viewport;
    const dx = (e.clientX - startMouse.x) / zoom;
    const dy = (e.clientY - startMouse.y) / zoom;

    store.setState((s) => {
      const device = s.devices.get(id);
      if (!device) return s;
      const devices = new Map(s.devices);
      devices.set(id, {
        ...device,
        position: { x: startPos.x + dx, y: startPos.y + dy },
      });
      return { devices };
    });
  }, [store]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
