import type { DeviceInstance, ConnectionInstance } from '@netx/sdk';
import type { CanvasState } from '@netx/canvas';
import type { StoreApi } from 'zustand';

interface Snapshot {
  devices: Map<string, DeviceInstance>;
  connections: Map<string, ConnectionInstance>;
}

const history: Snapshot[] = [];
const future: Snapshot[] = [];
const MAX_HISTORY = 50;
let recording = true;

function takeSnapshot(store: StoreApi<CanvasState>): Snapshot {
  const state = store.getState();
  return {
    devices: new Map(state.devices),
    connections: new Map(state.connections),
  };
}

function applySnapshot(store: StoreApi<CanvasState>, snapshot: Snapshot) {
  recording = false;
  store.setState({
    devices: new Map(snapshot.devices),
    connections: new Map(snapshot.connections),
  });
  recording = true;
}

export function enableUndoRedo(store: StoreApi<CanvasState>) {
  // Push initial state
  history.push(takeSnapshot(store));

  // Track changes
  let debounce: ReturnType<typeof setTimeout> | null = null;
  store.subscribe(() => {
    if (!recording) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      const snapshot = takeSnapshot(store);
      // Only push if actually different from last
      const last = history[history.length - 1];
      if (last && last.devices.size === snapshot.devices.size && last.connections.size === snapshot.connections.size) {
        // Quick check — might be same
        let same = true;
        for (const [id, dev] of snapshot.devices) {
          const prev = last.devices.get(id);
          if (!prev || prev.position.x !== dev.position.x || prev.position.y !== dev.position.y || prev.label !== dev.label) {
            same = false;
            break;
          }
        }
        if (same && snapshot.connections.size === last.connections.size) return;
      }
      history.push(snapshot);
      if (history.length > MAX_HISTORY) history.shift();
      future.length = 0; // Clear redo stack on new change
    }, 300);
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as Element)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    // Ctrl+Z = undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo(store);
    }
    // Ctrl+Y or Ctrl+Shift+Z = redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo(store);
    }
  });
}

function undo(store: StoreApi<CanvasState>) {
  if (history.length <= 1) return; // Keep at least initial state
  const current = history.pop()!;
  future.push(current);
  const prev = history[history.length - 1];
  if (prev) applySnapshot(store, prev);
}

function redo(store: StoreApi<CanvasState>) {
  if (future.length === 0) return;
  const next = future.pop()!;
  history.push(next);
  applySnapshot(store, next);
}
