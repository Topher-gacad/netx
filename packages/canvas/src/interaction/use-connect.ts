import { useCallback } from 'react';
import type { CanvasAPI, EventBus, ID, Point } from '@netx/sdk';
import type { CanvasState } from '../canvas-engine.js';
import type { StoreApi } from 'zustand';

export function useConnect(store: StoreApi<CanvasState>, canvasAPI: CanvasAPI, eventBus: EventBus) {
  const startConnection = useCallback((sourceDeviceId: ID, sourcePortId: string) => {
    // Check if this port is already connected
    const connections = Array.from(store.getState().connections.values());
    const inUse = connections.find(
      (c) =>
        (c.sourceDeviceId === sourceDeviceId && c.sourcePortId === sourcePortId) ||
        (c.targetDeviceId === sourceDeviceId && c.targetPortId === sourcePortId),
    );
    if (inUse) {
      eventBus.emit('ui:notification', { message: `Port ${sourcePortId} is already connected`, level: 'warn' });
      return;
    }

    store.setState({
      connecting: {
        active: true,
        sourceDeviceId,
        sourcePortId,
        cursorPosition: undefined,
      },
    });
  }, [store, eventBus]);

  const updateCursor = useCallback((position: Point) => {
    store.setState((s) => {
      if (!s.connecting.active) return s;
      return {
        connecting: { ...s.connecting, cursorPosition: position },
      };
    });
  }, [store]);

  const completeConnection = useCallback((targetDeviceId: ID, targetPortId: string) => {
    const { connecting } = store.getState();
    if (!connecting.active || !connecting.sourceDeviceId || !connecting.sourcePortId) return;

    // Don't connect to same device
    if (connecting.sourceDeviceId === targetDeviceId) {
      eventBus.emit('ui:notification', { message: 'Cannot connect a device to itself', level: 'warn' });
      cancelConnection();
      return;
    }

    try {
      canvasAPI.addConnection(
        'ethernet',
        connecting.sourceDeviceId,
        connecting.sourcePortId,
        targetDeviceId,
        targetPortId,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      eventBus.emit('ui:notification', { message: msg, level: 'error' });
    }

    store.setState({ connecting: { active: false } });
  }, [store, canvasAPI, eventBus]);

  const cancelConnection = useCallback(() => {
    store.setState({ connecting: { active: false } });
  }, [store]);

  return { startConnection, updateCursor, completeConnection, cancelConnection };
}
