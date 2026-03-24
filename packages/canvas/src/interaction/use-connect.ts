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

    // Check Serial-to-Ethernet compatibility
    const sourceIsSerial = connecting.sourcePortId.toLowerCase().startsWith('serial');
    const targetIsSerial = targetPortId.toLowerCase().startsWith('serial');
    if (sourceIsSerial !== targetIsSerial) {
      eventBus.emit('ui:notification', {
        message: 'Cannot connect Serial port to Ethernet port. Serial connects to Serial only (WAN links).',
        level: 'error',
      });
      cancelConnection();
      return;
    }

    // Warn if devices are already connected via another link
    const existingConnections = Array.from(store.getState().connections.values());
    const alreadyConnected = existingConnections.some(
      (c) =>
        (c.sourceDeviceId === connecting.sourceDeviceId && c.targetDeviceId === targetDeviceId) ||
        (c.sourceDeviceId === targetDeviceId && c.targetDeviceId === connecting.sourceDeviceId),
    );
    if (alreadyConnected) {
      eventBus.emit('ui:notification', {
        message: 'These devices are already connected. Adding a second link (only useful for different subnets).',
        level: 'warn',
      });
    }

    // Determine connection type based on port types
    const connType = sourceIsSerial ? 'serial' : 'ethernet';

    try {
      canvasAPI.addConnection(
        connType,
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
