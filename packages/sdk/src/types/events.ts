import type { Disposable, ID, Point } from './common.js';

export interface NetXEventMap {
  // Kernel lifecycle
  'kernel:ready': void;
  'plugin:activated': { pluginId: string };
  'plugin:deactivated': { pluginId: string };
  'plugin:error': { pluginId: string; error: unknown };

  // Canvas events
  'canvas:device:added': { deviceId: ID; deviceType: string; position: Point };
  'canvas:device:removed': { deviceId: ID };
  'canvas:device:moved': { deviceId: ID; position: Point };
  'canvas:device:selected': { deviceId: ID };
  'canvas:device:deselected': { deviceId: ID };
  'canvas:connection:added': { connectionId: ID; sourceDeviceId: ID; targetDeviceId: ID };
  'canvas:connection:removed': { connectionId: ID };
  'canvas:click': { position: Point; target?: ID };
  'canvas:contextmenu': { position: Point; target?: ID };
  'canvas:viewport:changed': { offset: Point; zoom: number };

  // UI events
  'ui:notification': { message: string; level: 'info' | 'warn' | 'error' };
  'ui:panel:toggled': { panelId: string; open: boolean };

  // Allow arbitrary string keys for plugin-defined events
  [key: string]: unknown;
}

export type EventHandler<T = unknown> = (payload: T) => void;

export interface EventBus {
  emit<K extends keyof NetXEventMap>(event: K & string, payload: NetXEventMap[K]): void;
  on<K extends keyof NetXEventMap>(event: K & string, handler: EventHandler<NetXEventMap[K]>): Disposable;
  once<K extends keyof NetXEventMap>(event: K & string, handler: EventHandler<NetXEventMap[K]>): Disposable;
  off<K extends keyof NetXEventMap>(event: K & string, handler: EventHandler<NetXEventMap[K]>): void;
}
