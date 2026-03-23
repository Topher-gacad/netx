import { createStore } from 'zustand/vanilla';
import { nanoid } from 'nanoid';
import type {
  CanvasAPI,
  Disposable,
  EventBus,
  ID,
  Point,
  DeviceTypeDefinition,
  ConnectionTypeDefinition,
  DeviceInstance,
  ConnectionInstance,
} from '@netx/sdk';

export interface CanvasState {
  deviceTypes: Map<string, DeviceTypeDefinition>;
  connectionTypes: Map<string, ConnectionTypeDefinition>;
  devices: Map<ID, DeviceInstance>;
  connections: Map<ID, ConnectionInstance>;
  viewport: { offset: Point; zoom: number };
  selection: Set<ID>;
  // Connection creation state
  connecting: {
    active: boolean;
    sourceDeviceId?: ID;
    sourcePortId?: string;
    cursorPosition?: Point;
  };
}

export function createCanvasEngine(eventBus: EventBus): { api: CanvasAPI; store: ReturnType<typeof createStore<CanvasState>> } {
  const store = createStore<CanvasState>(() => ({
    deviceTypes: new Map(),
    connectionTypes: new Map(),
    devices: new Map(),
    connections: new Map(),
    viewport: { offset: { x: 0, y: 0 }, zoom: 1 },
    selection: new Set(),
    connecting: { active: false },
  }));

  const api: CanvasAPI = {
    registerDeviceType(definition: DeviceTypeDefinition): Disposable {
      store.setState((s) => {
        const types = new Map(s.deviceTypes);
        types.set(definition.type, definition);
        return { deviceTypes: types };
      });
      return {
        dispose() {
          store.setState((s) => {
            const types = new Map(s.deviceTypes);
            types.delete(definition.type);
            return { deviceTypes: types };
          });
        },
      };
    },

    registerConnectionType(definition: ConnectionTypeDefinition): Disposable {
      store.setState((s) => {
        const types = new Map(s.connectionTypes);
        types.set(definition.type, definition);
        return { connectionTypes: types };
      });
      return {
        dispose() {
          store.setState((s) => {
            const types = new Map(s.connectionTypes);
            types.delete(definition.type);
            return { connectionTypes: types };
          });
        },
      };
    },

    addDevice(type: string, position: Point, config?: Record<string, unknown>): DeviceInstance {
      const typeDef = store.getState().deviceTypes.get(type);
      if (!typeDef) {
        throw new Error(`Unknown device type: "${type}"`);
      }

      const id = nanoid();
      const device: DeviceInstance = {
        id,
        type,
        position,
        size: { ...typeDef.defaultSize },
        config: { ...typeDef.defaultConfig, ...config },
        label: `${typeDef.label}${store.getState().devices.size + 1}`,
      };

      store.setState((s) => {
        const devices = new Map(s.devices);
        devices.set(id, device);
        return { devices };
      });

      eventBus.emit('canvas:device:added', {
        deviceId: id,
        deviceType: type,
        position,
      });

      return device;
    },

    removeDevice(id: ID): void {
      // Remove all connections involving this device
      const state = store.getState();
      const connectionsToRemove = Array.from(state.connections.values()).filter(
        (c) => c.sourceDeviceId === id || c.targetDeviceId === id,
      );
      for (const conn of connectionsToRemove) {
        api.removeConnection(conn.id);
      }

      store.setState((s) => {
        const devices = new Map(s.devices);
        devices.delete(id);
        const selection = new Set(s.selection);
        selection.delete(id);
        return { devices, selection };
      });

      eventBus.emit('canvas:device:removed', { deviceId: id });
    },

    addConnection(
      type: string,
      sourceDeviceId: ID,
      sourcePortId: string,
      targetDeviceId: ID,
      targetPortId: string,
    ): ConnectionInstance {
      const id = nanoid();
      const connection: ConnectionInstance = {
        id,
        type,
        sourceDeviceId,
        sourcePortId,
        targetDeviceId,
        targetPortId,
      };

      store.setState((s) => {
        const connections = new Map(s.connections);
        connections.set(id, connection);
        return { connections };
      });

      eventBus.emit('canvas:connection:added', {
        connectionId: id,
        sourceDeviceId,
        targetDeviceId,
      });

      return connection;
    },

    removeConnection(id: ID): void {
      store.setState((s) => {
        const connections = new Map(s.connections);
        connections.delete(id);
        return { connections };
      });

      eventBus.emit('canvas:connection:removed', { connectionId: id });
    },

    getDevices(): DeviceInstance[] {
      return Array.from(store.getState().devices.values());
    },

    getConnections(): ConnectionInstance[] {
      return Array.from(store.getState().connections.values());
    },

    getDevice(id: ID): DeviceInstance | undefined {
      return store.getState().devices.get(id);
    },

    getConnection(id: ID): ConnectionInstance | undefined {
      return store.getState().connections.get(id);
    },

    updateDevice(id: ID, updates: Partial<Pick<DeviceInstance, 'position' | 'size' | 'config' | 'label'>>): void {
      store.setState((s) => {
        const device = s.devices.get(id);
        if (!device) return s;

        const devices = new Map(s.devices);
        devices.set(id, { ...device, ...updates });
        return { devices };
      });

      if (updates.position) {
        eventBus.emit('canvas:device:moved', { deviceId: id, position: updates.position });
      }
    },

    getViewport() {
      return store.getState().viewport;
    },

    setViewport(offset: Point, zoom: number): void {
      store.setState({ viewport: { offset, zoom } });
      eventBus.emit('canvas:viewport:changed', { offset, zoom });
    },
  };

  return { api, store };
}
