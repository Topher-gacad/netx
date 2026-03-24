import { Terminal } from './Terminal.js';
import type { CanvasAPI, EventBus, UIExtensionAPI, ID } from '@netx/sdk';
import { useState, useEffect } from 'react';

let canvasRef: CanvasAPI | null = null;
let eventBusRef: EventBus | null = null;
let uiRef: UIExtensionAPI | null = null;

interface ActiveDevice {
  id: ID;
  type: string;
  hostname: string;
  ports: string[];
}

let activeDevice: ActiveDevice | null = null;

export function setCanvasRef(api: CanvasAPI) { canvasRef = api; }
export function setEventBusRef(bus: EventBus) { eventBusRef = bus; }
export function setUIRef(ui: UIExtensionAPI) { uiRef = ui; }

export function openCLIForDevice(id: ID, type: string, hostname: string, ports: string[]) {
  activeDevice = { id, type, hostname, ports };
  // Update modal title and make it visible via the UI extension API
  uiRef?.updateModal('cli-terminal', {
    title: `CLI — ${hostname} (${type})`,
    visible: true,
  });
}

export function closeCLI() {
  uiRef?.updateModal('cli-terminal', { visible: false });
}

// The component rendered inside the modal
export function CLIModalContent() {
  const [, setTick] = useState(0);

  // Re-render when active device changes
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    // Listen for modal visibility changes to trigger re-render
    const interval = setInterval(() => {
      // Simple polling to detect device changes
      handler();
    }, 300);
    return () => clearInterval(interval);
  }, []);

  if (!activeDevice || !canvasRef) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-secondary)', fontSize: '13px',
        fontFamily: 'monospace',
      }}>
        Double-click a device to open its CLI
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
