import type { PluginModule } from '@netx/sdk';
import { CLIModalContent, setCanvasRef, setEventBusRef, setUIRef, openCLIForDevice, closeCLI } from './CLIPanel.js';
import { deviceStates } from './cli-persistence.js';
import type { DeviceCLIState, InterfaceConfig } from './ios-engine.js';

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
    setUIRef(ctx.ui);

    // Register CLI as a floating modal via the extension API
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'cli-terminal',
        title: 'CLI Terminal',
        component: CLIModalContent,
        visible: false,
        defaultWidth: 560,
        defaultHeight: 320,
        defaultX: window.innerWidth / 2 - 280,
        defaultY: window.innerHeight - 380,
        onClose: closeCLI,
      }),
    );

    // Listen for double-click on devices to open CLI modal
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (!device) return;
        const portNames = getPortNames(device.type);
        openCLIForDevice(device.id, device.type, device.label, portNames);
      }),
    );

    // Persistence: save CLI configs
    ctx.onSave(() => {
      const data: Record<string, SerializedCLI> = {};
      for (const [id, state] of deviceStates) {
        data[id] = serializeCLI(state);
      }
      return data;
    });

    // Persistence: restore CLI configs
    ctx.onRestore((raw) => {
      const data = raw as Record<string, SerializedCLI>;
      if (!data) return;
      for (const [id, serialized] of Object.entries(data)) {
        const state = deserializeCLI(serialized);
        deviceStates.set(id, state);

        // Re-emit config to packet engine
        ctx.events.emit('cli:config-changed', {
          deviceId: id,
          config: {
            hostname: state.hostname,
            interfaces: state.interfaces,
            staticRoutes: state.staticRoutes,
          },
        });

        // Update canvas labels/IPs
        const ips: string[] = [];
        for (const [, iface] of state.interfaces) {
          if (iface.ip) ips.push(`${iface.ip}/${iface.mask ?? ''}`);
        }
        const device = ctx.canvas.getDevice(id);
        if (device) {
          ctx.canvas.updateDevice(id, {
            label: state.hostname,
            config: { ...device.config, ips, hostname: state.hostname },
          });
        }
      }
      console.log(`[CLISimulator] Restored ${Object.keys(data).length} device configs`);
    });

    // Toolbar button
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
          ctx.ui.notify('Double-click a device on the canvas to open its CLI', 'info');
        },
        tooltip: 'CLI Terminal — double-click a device',
        priority: 10,
      }),
    );

    // Status bar
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
    case 'l3-switch':
      return [
        'GigabitEthernet0/1', 'GigabitEthernet0/2', 'GigabitEthernet0/3', 'GigabitEthernet0/4',
        'GigabitEthernet0/5', 'GigabitEthernet0/6', 'GigabitEthernet0/7', 'GigabitEthernet0/8',
        'Vlan1', 'Vlan10', 'Vlan20',
      ];
    case 'firewall':
      return ['Outside', 'Inside', 'DMZ'];
    case 'hub':
      return ['Port1', 'Port2', 'Port3', 'Port4'];
    case 'wireless-ap':
      return ['Ethernet0'];
    case 'server':
      return ['Ethernet0', 'Ethernet1'];
    case 'pc':
      return ['Ethernet0'];
    default:
      return ['Ethernet0'];
  }
}

// Serialization helpers
interface SerializedCLI {
  deviceId: string;
  hostname: string;
  interfaces: [string, InterfaceConfig][];
  vlans: [number, string][];
  staticRoutes: Array<{ network: string; mask: string; nextHop: string }>;
  secretPassword?: string;
}

function serializeCLI(state: DeviceCLIState): SerializedCLI {
  return {
    deviceId: state.deviceId,
    hostname: state.hostname,
    interfaces: Array.from(state.interfaces.entries()),
    vlans: Array.from(state.vlans.entries()),
    staticRoutes: state.staticRoutes,
    secretPassword: state.secretPassword,
  };
}

function deserializeCLI(data: SerializedCLI): DeviceCLIState {
  return {
    deviceId: data.deviceId,
    hostname: data.hostname,
    mode: 'user',
    interfaces: new Map(data.interfaces),
    vlans: new Map(data.vlans),
    staticRoutes: data.staticRoutes,
    history: [],
    historyIndex: -1,
    secretPassword: data.secretPassword,
  };
}
