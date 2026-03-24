import type { ID } from '@netx/sdk';
import type { DeviceCLIState } from './ios-engine.js';
import { createDeviceCLIState } from './ios-engine.js';

// In-memory store — shared with Terminal component
// Persistence is handled by the plugin's onSave/onRestore lifecycle hooks
export const deviceStates = new Map<ID, DeviceCLIState>();

export function getOrCreateDeviceState(deviceId: ID, hostname: string, ports: string[]): DeviceCLIState {
  let s = deviceStates.get(deviceId);
  if (!s) {
    s = createDeviceCLIState(deviceId, hostname, ports);
    deviceStates.set(deviceId, s);
  }
  return s;
}
