import { useCallback } from 'react';
import type { EventBus, ID } from '@netx/sdk';
import type { CanvasState } from '../canvas-engine.js';
import type { StoreApi } from 'zustand';

export function useSelection(store: StoreApi<CanvasState>, eventBus: EventBus) {
  const select = useCallback((deviceId: ID, multi: boolean = false) => {
    store.setState((s) => {
      const selection = multi ? new Set(s.selection) : new Set<ID>();
      if (selection.has(deviceId)) {
        selection.delete(deviceId);
        eventBus.emit('canvas:device:deselected', { deviceId });
      } else {
        selection.add(deviceId);
        eventBus.emit('canvas:device:selected', { deviceId });
      }
      return { selection };
    });
  }, [store, eventBus]);

  const clearSelection = useCallback(() => {
    const { selection } = store.getState();
    for (const id of selection) {
      eventBus.emit('canvas:device:deselected', { deviceId: id });
    }
    store.setState({ selection: new Set() });
  }, [store, eventBus]);

  return { select, clearSelection };
}
