import type { ID } from '@netx/sdk';
import type { DeviceCLIState, InterfaceConfig, CLIMode } from './ios-engine.js';
import { createDeviceCLIState } from './ios-engine.js';

const STORAGE_KEY = 'netx-cli-configs';
const SAVE_DEBOUNCE = 500;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

interface SerializedCLIState {
  deviceId: string;
  hostname: string;
  mode: CLIMode;
  interfaces: [string, InterfaceConfig][];
  vlans: [number, string][];
  staticRoutes: Array<{ network: string; mask: string; nextHop: string }>;
  secretPassword?: string;
}

// In-memory store shared with Terminal
export const deviceStates = new Map<ID, DeviceCLIState>();

function serialize(state: DeviceCLIState): SerializedCLIState {
  return {
    deviceId: state.deviceId,
    hostname: state.hostname,
    mode: state.mode,
    interfaces: Array.from(state.interfaces.entries()),
    vlans: Array.from(state.vlans.entries()),
    staticRoutes: state.staticRoutes,
    secretPassword: state.secretPassword,
  };
}

function deserialize(data: SerializedCLIState): DeviceCLIState {
  return {
    deviceId: data.deviceId,
    hostname: data.hostname,
    mode: data.mode,
    currentInterface: undefined,
    currentVlan: undefined,
    interfaces: new Map(data.interfaces),
    vlans: new Map(data.vlans),
    staticRoutes: data.staticRoutes,
    history: [],
    historyIndex: -1,
    secretPassword: data.secretPassword,
  };
}

export function saveCLIStates() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data: Record<string, SerializedCLIState> = {};
    for (const [id, state] of deviceStates) {
      data[id] = serialize(state);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('[CLI Persistence] Failed to save:', err);
    }
  }, SAVE_DEBOUNCE);
}

export function saveImmediately() {
  if (saveTimer) clearTimeout(saveTimer);
  const data: Record<string, SerializedCLIState> = {};
  for (const [id, state] of deviceStates) {
    data[id] = serialize(state);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[CLI Persistence] Failed to save:', err);
  }
}

export function restoreCLIStates(): Map<ID, DeviceCLIState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deviceStates;

    const data: Record<string, SerializedCLIState> = JSON.parse(raw);
    for (const [id, serialized] of Object.entries(data)) {
      deviceStates.set(id, deserialize(serialized));
    }
    console.log(`[CLI Persistence] Restored ${deviceStates.size} device configs`);
  } catch (err) {
    console.warn('[CLI Persistence] Failed to restore:', err);
  }
  return deviceStates;
}

export function getOrCreateDeviceState(deviceId: ID, hostname: string, ports: string[]): DeviceCLIState {
  let s = deviceStates.get(deviceId);
  if (!s) {
    s = createDeviceCLIState(deviceId, hostname, ports);
    deviceStates.set(deviceId, s);
  }
  return s;
}

// Remap old device IDs to new ones after topology restore
export function remapCLIStates(idMap: Map<string, string>) {
  const entries = Array.from(deviceStates.entries());
  deviceStates.clear();
  for (const [oldId, state] of entries) {
    const newId = idMap.get(oldId);
    if (newId) {
      state.deviceId = newId;
      deviceStates.set(newId, state);
      console.log(`[CLI Persistence] Remapped ${oldId} → ${newId} (${state.hostname})`);
    }
  }
}

// Save before page unload
window.addEventListener('beforeunload', saveImmediately);
