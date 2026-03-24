import type { CanvasAPI, DeviceInstance, ConnectionInstance } from '@netx/sdk';
import type { CanvasState } from '@netx/canvas';
import type { StoreApi } from 'zustand';

const STORAGE_KEY = 'netx-topology';
const SAVE_DEBOUNCE = 500;

interface SavedTopology {
  devices: DeviceInstance[];
  connections: ConnectionInstance[];
  version: number;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let canvasStoreRef: StoreApi<CanvasState> | null = null;

function saveTopology() {
  if (!canvasStoreRef) return;
  const state = canvasStoreRef.getState();
  const data: SavedTopology = {
    devices: Array.from(state.devices.values()),
    connections: Array.from(state.connections.values()),
    version: 1,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[Persistence] Failed to save:', err);
  }
}

export function enableAutoSave(canvasStore: StoreApi<CanvasState>) {
  canvasStoreRef = canvasStore;

  canvasStore.subscribe(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveTopology, SAVE_DEBOUNCE);
  });

  window.addEventListener('beforeunload', () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTopology();
  });
}

export function restoreTopology(canvasAPI: CanvasAPI): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data: SavedTopology = JSON.parse(raw);
    if (!data.devices || data.devices.length === 0) return false;

    console.log(`[Persistence] Restoring ${data.devices.length} devices, ${data.connections.length} connections...`);

    // Restore devices with ORIGINAL IDs (no remapping needed)
    for (const device of data.devices) {
      try {
        const added = canvasAPI.addDevice(device.type, device.position, device.config, device.id);
        canvasAPI.updateDevice(added.id, {
          label: device.label,
          size: device.size,
        });
      } catch (err) {
        console.warn(`[Persistence] Failed to restore device ${device.label}:`, err);
      }
    }

    // Restore connections (IDs match because we kept originals)
    for (const conn of data.connections) {
      try {
        canvasAPI.addConnection(
          conn.type,
          conn.sourceDeviceId,
          conn.sourcePortId,
          conn.targetDeviceId,
          conn.targetPortId,
        );
      } catch (err) {
        console.warn(`[Persistence] Failed to restore connection:`, err);
      }
    }

    console.log(`[Persistence] Restore complete`);
    return true;
  } catch (err) {
    console.warn('[Persistence] Failed to restore:', err);
    return false;
  }
}

export function clearSavedTopology() {
  localStorage.removeItem(STORAGE_KEY);
}
