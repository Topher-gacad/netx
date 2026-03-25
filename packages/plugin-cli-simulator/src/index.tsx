import type { PluginModule } from '@netx/sdk';
import { CLIModalContent, setCanvasRef, setEventBusRef, setUIRef, openCLIForDevice, closeCLI } from './CLIPanel.js';
import { deviceStates } from './cli-persistence.js';
import type { DeviceCLIState, InterfaceConfig, DHCPPool } from './ios-engine.js';
import { registerDHCPServer } from './ios-engine.js';

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

    // Devices that have CLI access
    // Laptop has its own launcher in basic-devices plugin
    const cliDevices = ['router', 'switch', 'switch-24', 'l3-switch', 'firewall', 'server', 'pc', 'wireless-ap'];
    // Devices with NO config interface (show message instead)
    const noConfigDevices = ['hub', 'switch-unmanaged', 'ip-phone'];
    // Web GUI devices are handled by their own plugins (pfsense, tplink, nas)

    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (!device) return;

        if (cliDevices.includes(device.type)) {
          const portNames = getPortNames(device.type);
          openCLIForDevice(device.id, device.type, device.label, portNames);
        } else if (noConfigDevices.includes(device.type)) {
          // Show a helpful message
          const messages: Record<string, string> = {
            'hub': 'Hubs have no configuration — they broadcast all traffic to all ports automatically.',
            'switch-unmanaged': 'Unmanaged switches have no configuration — just plug in cables and they forward traffic.',
            'ip-phone': 'IP Phones are configured through the call server (CUCM), not directly. Connect it: Switch→Phone(SW)→Phone(PC)→PC.',
            'printer': 'Network printers are configured through their built-in web interface (not simulated). Just assign a static IP via the printer\'s LCD panel.',
            'nas': 'NAS devices are configured through their web interface (e.g., Synology DSM). Just connect it to the network and assign an IP.',
          };
          ctx.ui.notify(messages[device.type] ?? 'This device has no configuration interface.', 'info');
        }
        // pfsense and tplink handled by basic-devices plugin
      }),
    );

    // Listen for laptop CLI open request (from laptop launcher)
    ctx.onDispose(
      ctx.events.on('laptop:open-cli', (payload: unknown) => {
        const { deviceId, deviceType, label } = payload as { deviceId: string; deviceType: string; label: string };
        const portNames = getPortNames(deviceType);
        openCLIForDevice(deviceId, deviceType, label, portNames);
      }),
    );

    // Listen for pfSense/TP-Link DHCP server registration
    ctx.onDispose(
      ctx.events.on('pfsense:dhcp-available', (payload: unknown) => {
        const data = payload as { deviceId: string; network: string; mask: string; gateway: string; rangeStart: string; rangeEnd: string };
        const startNum = parseInt(data.rangeStart.split('.').pop() ?? '100');
        const pools = new Map<string, DHCPPool>();
        pools.set('lan', {
          name: 'lan',
          network: data.network,
          mask: data.mask,
          gateway: data.gateway,
          nextAddress: startNum,
        });
        registerDHCPServer(data.deviceId, pools);
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

    // CLI opens via double-click on devices — no toolbar button needed

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
    case 'pfsense':
      return ['WAN', 'LAN', 'OPT1', 'OPT2'];
    case 'tplink':
      return ['WAN', 'LAN1', 'LAN2', 'LAN3', 'LAN4'];
    case 'hub':
      return ['Port1', 'Port2', 'Port3', 'Port4'];
    case 'wireless-ap':
      return ['Ethernet0'];
    case 'server':
      return ['Ethernet0', 'Ethernet1'];
    case 'pc':
      return ['Ethernet0'];
    case 'laptop':
      return ['Ethernet0'];
    case 'ip-phone':
      return ['SW', 'PC'];
    case 'printer':
      return ['Ethernet0'];
    case 'nas':
      return ['Ethernet0', 'Ethernet1'];
    case 'switch-24':
      return Array.from({ length: 24 }, (_, i) => `FastEthernet0/${i + 1}`);
    case 'switch-unmanaged':
      return ['Port1', 'Port2', 'Port3', 'Port4', 'Port5'];
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
