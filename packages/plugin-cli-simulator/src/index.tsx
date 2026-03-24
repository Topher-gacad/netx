import type { PluginModule } from '@netx/sdk';
import { setActiveDevice, setCanvasRef, setEventBusRef, closeModal } from './CLIPanel.js';
import { restoreCLIStates, remapCLIStates, deviceStates } from './cli-persistence.js';

export { remapCLIStates, restoreCLIStates, deviceStates as cliDeviceStates } from './cli-persistence.js';

// Re-export for shell to use
export { CLIModalContent, isModalOpen, getActiveDeviceInfo, closeModal, onModalChange } from './CLIPanel.js';

export const cliSimulatorPlugin: PluginModule = {
  manifest: {
    id: 'netx.cli-simulator',
    name: 'CLI Simulator',
    version: '0.1.0',
    description: 'IOS-like CLI terminal for configuring network devices.',
    dependencies: ['netx.basic-devices'],
  },

  activate(ctx) {
    setCanvasRef(ctx.canvas);
    setEventBusRef(ctx.events);

    // CLI state restore happens in main.tsx after topology restore + ID remap

    // Listen for double-click on devices to open CLI modal
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (!device) return;

        const portNames = getPortNames(device.type);
        setActiveDevice(device.id, device.type, device.label, portNames);
      }),
    );

    // Register toolbar item
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'cli-toggle',
        group: 'tools',
        label: 'CLI',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <polyline points="6,10 10,14 6,18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => {
          ctx.ui.notify('Click a device on the canvas to open its CLI', 'info');
        },
        tooltip: 'CLI Terminal — click a device first',
        priority: 10,
      }),
    );

    // Status bar indicator
    ctx.onDispose(
      ctx.ui.registerStatusBarItem({
        id: 'cli-status',
        align: 'right',
        component: () => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            CLI: <span style={{ color: '#00ff88' }}>Ready</span>
          </span>
        ),
        priority: 10,
      }),
    );

    console.log('[CLISimulator] Plugin activated');
  },
};

function getPortNames(deviceType: string): string[] {
  switch (deviceType) {
    case 'router':
      return ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'Serial0/0/0', 'Serial0/0/1'];
    case 'switch':
      return [
        'FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/3', 'FastEthernet0/4',
        'FastEthernet0/5', 'FastEthernet0/6', 'FastEthernet0/7', 'FastEthernet0/8',
        'GigabitEthernet0/1', 'GigabitEthernet0/2',
      ];
    case 'server':
      return ['Ethernet0', 'Ethernet1'];
    case 'pc':
      return ['Ethernet0'];
    default:
      return ['Ethernet0'];
  }
}
