import type { PluginModule } from '@netx/sdk';
import { SwitchRenderer } from './renderers/SwitchRenderer.js';
import { RouterRenderer } from './renderers/RouterRenderer.js';
import { PCRenderer } from './renderers/PCRenderer.js';
import { ServerRenderer } from './renderers/ServerRenderer.js';
import { FirewallRenderer } from './renderers/FirewallRenderer.js';
import { HubRenderer } from './renderers/HubRenderer.js';
import { WirelessAPRenderer } from './renderers/WirelessAPRenderer.js';
import { L3SwitchRenderer } from './renderers/L3SwitchRenderer.js';
import { SwitchIcon } from './icons/SwitchIcon.js';
import { RouterIcon } from './icons/RouterIcon.js';
import { PCIcon } from './icons/PCIcon.js';
import { ServerIcon } from './icons/ServerIcon.js';
import { FirewallIcon } from './icons/FirewallIcon.js';
import { HubIcon } from './icons/HubIcon.js';
import { WirelessAPIcon } from './icons/WirelessAPIcon.js';
import { L3SwitchIcon } from './icons/L3SwitchIcon.js';
import { DevicePalette, setCanvasAPI } from './DevicePalette.js';

export const basicDevicesPlugin: PluginModule = {
  manifest: {
    id: 'netx.basic-devices',
    name: 'Basic Network Devices',
    version: '0.1.0',
    description: 'Router, Switch, PC, and Server with detailed SVG renderers.',
  },

  activate(ctx) {
    setCanvasAPI(ctx.canvas);

    // Register device types
    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'switch',
        label: 'Switch',
        category: 'network',
        ports: [
          { id: 'FastEthernet0/1', label: 'Fa0/1', position: { x: 0.08, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/2', label: 'Fa0/2', position: { x: 0.18, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/3', label: 'Fa0/3', position: { x: 0.28, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/4', label: 'Fa0/4', position: { x: 0.38, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/5', label: 'Fa0/5', position: { x: 0.48, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/6', label: 'Fa0/6', position: { x: 0.58, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/7', label: 'Fa0/7', position: { x: 0.68, y: 0.7 }, accepts: ['ethernet'] },
          { id: 'FastEthernet0/8', label: 'Fa0/8', position: { x: 0.78, y: 0.7 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 180, height: 50 },
        renderer: SwitchRenderer,
        icon: SwitchIcon,
        defaultConfig: { portCount: 8 },
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'router',
        label: 'Router',
        category: 'network',
        ports: [
          { id: 'GigabitEthernet0/0', label: 'Gi0/0', position: { x: 0.08, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/1', label: 'Gi0/1', position: { x: 0.22, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'Serial0/0/0', label: 'S0/0/0', position: { x: 0.42, y: 0.75 }, accepts: ['serial'] },
          { id: 'Serial0/0/1', label: 'S0/0/1', position: { x: 0.58, y: 0.75 }, accepts: ['serial'] },
        ],
        defaultSize: { width: 160, height: 50 },
        renderer: RouterRenderer,
        icon: RouterIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'pc',
        label: 'PC',
        category: 'endpoint',
        ports: [
          { id: 'Ethernet0', label: 'Ethernet0', position: { x: 0.5, y: 0.95 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 60, height: 80 },
        renderer: PCRenderer,
        icon: PCIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'server',
        label: 'Server',
        category: 'endpoint',
        ports: [
          { id: 'Ethernet0', label: 'ETH0', position: { x: 0.1, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Ethernet1', label: 'ETH1', position: { x: 0.25, y: 0.8 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 120, height: 45 },
        renderer: ServerRenderer,
        icon: ServerIcon,
      }),
    );

    // Register connection types
    ctx.onDispose(
      ctx.canvas.registerConnectionType({
        type: 'ethernet',
        label: 'Ethernet (Straight-through)',
        style: { color: '#4a9eff', width: 2 },
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerConnectionType({
        type: 'serial',
        label: 'Serial',
        style: { color: '#ff6a4a', width: 2, dashArray: '6 3' },
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerConnectionType({
        type: 'crossover',
        label: 'Ethernet (Crossover)',
        style: { color: '#ffaa00', width: 2, dashArray: '4 2' },
      }),
    );

    // --- NEW DEVICES ---

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'firewall',
        label: 'Firewall',
        category: 'security',
        ports: [
          { id: 'Outside', label: 'Outside', position: { x: 0.1, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'Inside', label: 'Inside', position: { x: 0.35, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'DMZ', label: 'DMZ', position: { x: 0.6, y: 0.75 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 120, height: 45 },
        renderer: FirewallRenderer,
        icon: FirewallIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'hub',
        label: 'Hub',
        category: 'network',
        ports: [
          { id: 'Port1', label: 'Port 1', position: { x: 0.1, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port2', label: 'Port 2', position: { x: 0.35, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port3', label: 'Port 3', position: { x: 0.6, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port4', label: 'Port 4', position: { x: 0.85, y: 0.8 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 100, height: 40 },
        renderer: HubRenderer,
        icon: HubIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'wireless-ap',
        label: 'AP',
        category: 'wireless',
        ports: [
          { id: 'Ethernet0', label: 'Ethernet0', position: { x: 0.5, y: 0.95 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 60, height: 60 },
        renderer: WirelessAPRenderer,
        icon: WirelessAPIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'l3-switch',
        label: 'L3 Switch',
        category: 'network',
        ports: [
          { id: 'GigabitEthernet0/1', label: 'Gi0/1', position: { x: 0.06, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/2', label: 'Gi0/2', position: { x: 0.18, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/3', label: 'Gi0/3', position: { x: 0.3, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/4', label: 'Gi0/4', position: { x: 0.42, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/5', label: 'Gi0/5', position: { x: 0.54, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/6', label: 'Gi0/6', position: { x: 0.66, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/7', label: 'Gi0/7', position: { x: 0.78, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'GigabitEthernet0/8', label: 'Gi0/8', position: { x: 0.9, y: 0.75 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 140, height: 45 },
        renderer: L3SwitchRenderer,
        icon: L3SwitchIcon,
      }),
    );

    // Register device palette panel
    ctx.onDispose(
      ctx.ui.registerPanel({
        id: 'device-palette',
        slot: 'left',
        label: 'Devices',
        component: DevicePalette,
        priority: 0,
      }),
    );

    // Toolbar quick-add buttons
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'add-router',
        group: 'devices',
        label: 'Router',
        icon: RouterIcon,
        onClick: () => {
          const x = 150 + Math.random() * 300;
          const y = 100 + Math.random() * 200;
          ctx.canvas.addDevice('router', { x, y });
          ctx.ui.notify('Router added', 'info');
        },
        tooltip: 'Add Router',
        priority: 0,
      }),
    );

    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'add-switch',
        group: 'devices',
        label: 'Switch',
        icon: SwitchIcon,
        onClick: () => {
          const x = 150 + Math.random() * 300;
          const y = 100 + Math.random() * 200;
          ctx.canvas.addDevice('switch', { x, y });
          ctx.ui.notify('Switch added', 'info');
        },
        tooltip: 'Add Switch',
        priority: 1,
      }),
    );

    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'add-pc',
        group: 'devices',
        label: 'PC',
        icon: PCIcon,
        onClick: () => {
          const x = 150 + Math.random() * 300;
          const y = 100 + Math.random() * 200;
          ctx.canvas.addDevice('pc', { x, y });
          ctx.ui.notify('PC added', 'info');
        },
        tooltip: 'Add PC',
        priority: 2,
      }),
    );

    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'add-server',
        group: 'devices',
        label: 'Server',
        icon: ServerIcon,
        onClick: () => {
          const x = 150 + Math.random() * 300;
          const y = 100 + Math.random() * 200;
          ctx.canvas.addDevice('server', { x, y });
          ctx.ui.notify('Server added', 'info');
        },
        tooltip: 'Add Server',
        priority: 3,
      }),
    );

    console.log('[BasicDevices] Plugin activated — 4 device types, 3 connection types registered');
  },
};
