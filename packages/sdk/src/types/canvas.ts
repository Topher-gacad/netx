import type { ComponentType } from 'react';
import type { Disposable, ID, Point, Size } from './common.js';

export interface PortDefinition {
  id: string;
  label: string;
  position: Point;
  accepts: string[];
}

export interface DeviceTypeDefinition {
  type: string;
  label: string;
  category: string;
  ports: PortDefinition[];
  defaultSize: Size;
  renderer: ComponentType<DeviceRendererProps>;
  icon: ComponentType<{ size: number }>;
  defaultConfig?: Record<string, unknown>;
}

export interface DeviceRendererProps {
  id: ID;
  type: string;
  position: Point;
  size: Size;
  ports: PortDefinition[];
  selected: boolean;
  config: Record<string, unknown>;
  label: string;
}

export interface ConnectionTypeDefinition {
  type: string;
  label: string;
  renderer?: ComponentType<ConnectionRendererProps>;
  style?: { color: string; dashArray?: string; width: number };
}

export interface ConnectionRendererProps {
  id: ID;
  type: string;
  sourcePosition: Point;
  targetPosition: Point;
  selected: boolean;
}

export interface DeviceInstance {
  id: ID;
  type: string;
  position: Point;
  size: Size;
  config: Record<string, unknown>;
  label: string;
}

export interface ConnectionInstance {
  id: ID;
  type: string;
  sourceDeviceId: ID;
  sourcePortId: string;
  targetDeviceId: ID;
  targetPortId: string;
}

export interface CanvasAPI {
  registerDeviceType(definition: DeviceTypeDefinition): Disposable;
  registerConnectionType(definition: ConnectionTypeDefinition): Disposable;
  addDevice(type: string, position: Point, config?: Record<string, unknown>): DeviceInstance;
  removeDevice(id: ID): void;
  addConnection(
    type: string,
    sourceDeviceId: ID,
    sourcePortId: string,
    targetDeviceId: ID,
    targetPortId: string,
  ): ConnectionInstance;
  removeConnection(id: ID): void;
  getDevices(): DeviceInstance[];
  getConnections(): ConnectionInstance[];
  getDevice(id: ID): DeviceInstance | undefined;
  getConnection(id: ID): ConnectionInstance | undefined;
  updateDevice(id: ID, updates: Partial<Pick<DeviceInstance, 'position' | 'size' | 'config' | 'label'>>): void;
  getViewport(): { offset: Point; zoom: number };
  setViewport(offset: Point, zoom: number): void;
}
