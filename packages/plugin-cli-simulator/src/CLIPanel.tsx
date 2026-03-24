import { Terminal } from './Terminal.js';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';
import { useState, useEffect } from 'react';

let canvasRef: CanvasAPI | null = null;
let eventBusRef: EventBus | null = null;
let forceUpdateFn: (() => void) | null = null;

interface ActiveDevice {
  id: ID;
  type: string;
  hostname: string;
  ports: string[];
}

let activeDevice: ActiveDevice | null = null;
let modalVisible = false;

// Shell registers a callback to know when modal state changes
const modalListeners = new Set<() => void>();

export function onModalChange(fn: () => void): () => void {
  modalListeners.add(fn);
  return () => modalListeners.delete(fn);
}

function notifyModalChange() {
  forceUpdateFn?.();
  for (const fn of modalListeners) fn();
}

export function setActiveDevice(id: ID, type: string, hostname: string, ports: string[]) {
  activeDevice = { id, type, hostname, ports };
  modalVisible = true;
  notifyModalChange();
}

export function closeModal() {
  modalVisible = false;
  notifyModalChange();
}

export function isModalOpen() {
  return modalVisible;
}

export function getActiveDeviceInfo(): ActiveDevice | null {
  return activeDevice;
}

export function setCanvasRef(api: CanvasAPI) {
  canvasRef = api;
}

export function setEventBusRef(bus: EventBus) {
  eventBusRef = bus;
}

export function getActiveDeviceId(): ID | null {
  return activeDevice?.id ?? null;
}

// This component renders the terminal content inside the floating window
export function CLIModalContent() {
  const [, setTick] = useState(0);

  useEffect(() => {
    forceUpdateFn = () => setTick((t) => t + 1);
    return () => { forceUpdateFn = null; };
  }, []);

  if (!activeDevice || !canvasRef) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-secondary)', fontSize: '13px',
        fontFamily: 'monospace',
      }}>
        Click a device on the canvas to open its CLI
      </div>
    );
  }

  return (
    <Terminal
      key={activeDevice.id}
      deviceId={activeDevice.id}
      deviceType={activeDevice.type}
      hostname={activeDevice.hostname}
      ports={activeDevice.ports}
      canvasAPI={canvasRef}
      eventBus={eventBusRef ?? undefined}
    />
  );
}
