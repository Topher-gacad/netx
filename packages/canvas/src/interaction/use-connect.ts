import { useCallback } from 'react';
import type { CanvasAPI, ID, Point } from '@netx/sdk';
import type { CanvasState } from '../canvas-engine.js';
import type { StoreApi } from 'zustand';

export function useConnect(store: StoreApi<CanvasState>, canvasAPI: CanvasAPI) {
  const startConnection = useCallback((sourceDeviceId: ID, sourcePortId: string) => {
    store.setState({
      connecting: {
        active: true,
        sourceDeviceId,
        sourcePortId,
        cursorPosition: undefined,
      },
    });
  }, [store]);

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
      console.error('[Canvas] Failed to create connection:', err);
    }

    store.setState({ connecting: { active: false } });
  }, [store, canvasAPI]);

  const cancelConnection = useCallback(() => {
    store.setState({ connecting: { active: false } });
  }, [store]);

  return { startConnection, updateCursor, completeConnection, cancelConnection };
}
