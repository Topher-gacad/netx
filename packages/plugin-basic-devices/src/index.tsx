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
import { PfSenseRenderer } from './renderers/PfSenseRenderer.js';
import { PfSenseIcon } from './icons/PfSenseIcon.js';
import { PfSenseGUIPanel, openPfSenseGUI, closePfSenseGUI, getPfSenseConfigs, restorePfSenseConfigs } from './pfsense/PfSenseGUI.js';
import { TpLinkRenderer } from './renderers/TpLinkRenderer.js';
import { TpLinkIcon } from './icons/TpLinkIcon.js';
import { TpLinkGUIPanel, openTpLinkGUI, closeTpLinkGUI, getTpLinkConfigs, restoreTpLinkConfigs, initTpLinkDevice } from './tplink/TpLinkGUI.js';
import { UnmanagedSwitchRenderer } from './renderers/UnmanagedSwitchRenderer.js';
import { NasGUIPanel, openNasGUI, closeNasGUI, getNasConfigs, restoreNasConfigs } from './nas/NasGUI.js';
import { PrinterGUIPanel, openPrinterGUI, closePrinterGUI, getPrinterConfigs, restorePrinterConfigs } from './printer/PrinterGUI.js';
import { LaptopRenderer } from './renderers/LaptopRenderer.js';
import { IPPhoneRenderer } from './renderers/IPPhoneRenderer.js';
import { PrinterRenderer } from './renderers/PrinterRenderer.js';
import { NASRenderer } from './renderers/NASRenderer.js';
import { LaptopIcon } from './icons/LaptopIcon.js';
import { IPPhoneIcon } from './icons/IPPhoneIcon.js';
import { PrinterIcon } from './icons/PrinterIcon.js';
import { NASIcon } from './icons/NASIcon.js';
import { Switch24Icon } from './icons/Switch24Icon.js';
import { UnmanagedSwitchIcon } from './icons/UnmanagedSwitchIcon.js';
import { DevicePalette, setCanvasAPI } from './DevicePalette.js';
import { WifiDialog, initWifiManager, openWifiDialog, closeWifiDialog, isWirelessCapable, registerAPSSID } from './wireless/WifiManager.js';
import { LaptopLauncherPanel, openLaptopLauncher, closeLaptopLauncher } from './laptop/LaptopLauncher.js';

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
        style: { color: '#ff6a4a', width: 2 },
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerConnectionType({
        type: 'crossover',
        label: 'Ethernet (Crossover)',
        style: { color: '#ffaa00', width: 2 },
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerConnectionType({
        type: 'wireless',
        label: 'Wireless (WiFi)',
        style: { color: '#00bceb', width: 1.5, dashArray: '3 4' },
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
          { id: 'WiFi0', label: 'WiFi', position: { x: 0.5, y: 0.05 }, accepts: ['wireless'] },
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

    // pfSense firewall — opens web GUI instead of CLI
    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'pfsense',
        label: 'pfSense',
        category: 'security',
        ports: [
          { id: 'WAN', label: 'WAN', position: { x: 0.08, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'LAN', label: 'LAN', position: { x: 0.25, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'OPT1', label: 'OPT1', position: { x: 0.42, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'OPT2', label: 'OPT2', position: { x: 0.6, y: 0.75 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 130, height: 48 },
        renderer: PfSenseRenderer,
        icon: PfSenseIcon,
      }),
    );

    // Register pfSense web GUI as a floating modal
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'pfsense-gui',
        title: 'pfSense — Web Configuration',
        component: PfSenseGUIPanel,
        visible: false,
        defaultWidth: 650,
        defaultHeight: 480,
        defaultX: Math.max(20, (window.innerWidth - 650) / 2),
        defaultY: 60,
        onClose: () => {
          closePfSenseGUI();
          ctx.ui.updateModal('pfsense-gui', { visible: false });
        },
      }),
    );

    // Open pfSense GUI on double-click (instead of CLI)
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (device && device.type === 'pfsense') {
          openPfSenseGUI(device.id, ctx.canvas, ctx.events);
          ctx.ui.updateModal('pfsense-gui', {
            title: `pfSense — ${device.label}`,
            visible: true,
          });
        }
      }),
    );

    // TP-Link home router
    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'tplink',
        label: 'TP-Link',
        category: 'consumer',
        ports: [
          { id: 'WAN', label: 'WAN', position: { x: 0.08, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'LAN1', label: 'LAN1', position: { x: 0.25, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'LAN2', label: 'LAN2', position: { x: 0.42, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'LAN3', label: 'LAN3', position: { x: 0.6, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'LAN4', label: 'LAN4', position: { x: 0.77, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'WiFi0', label: 'WiFi', position: { x: 0.5, y: 0.05 }, accepts: ['wireless'] },
        ],
        defaultSize: { width: 120, height: 48 },
        renderer: TpLinkRenderer,
        icon: TpLinkIcon,
      }),
    );

    // TP-Link web GUI modal
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'tplink-gui',
        title: 'TP-Link — Web Management',
        component: TpLinkGUIPanel,
        visible: false,
        defaultWidth: 620,
        defaultHeight: 480,
        defaultX: Math.max(20, (window.innerWidth - 620) / 2),
        defaultY: 60,
        onClose: () => {
          closeTpLinkGUI();
          ctx.ui.updateModal('tplink-gui', { visible: false });
        },
      }),
    );

    // Open TP-Link GUI on double-click
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (device && device.type === 'tplink') {
          openTpLinkGUI(device.id, ctx.canvas, ctx.events);
          ctx.ui.updateModal('tplink-gui', {
            title: `TP-Link — ${device.label}`,
            visible: true,
          });
        }
      }),
    );

    // NAS Synology DSM web GUI modal
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'nas-gui',
        title: 'Synology DSM',
        component: NasGUIPanel,
        visible: false,
        defaultWidth: 700,
        defaultHeight: 500,
        defaultX: Math.max(20, (window.innerWidth - 700) / 2),
        defaultY: 50,
        onClose: () => {
          closeNasGUI();
          ctx.ui.updateModal('nas-gui', { visible: false });
        },
      }),
    );

    // Open NAS GUI on double-click
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (device && device.type === 'nas') {
          openNasGUI(device.id, ctx.canvas, ctx.events);
          ctx.ui.updateModal('nas-gui', {
            title: `Synology DSM — ${device.label}`,
            visible: true,
          });
        }
      }),
    );

    // --- WIRELESS SYSTEM ---
    initWifiManager(ctx.canvas, ctx.events);

    // Register WiFi dialog modal
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'wifi-dialog',
        title: 'WiFi Networks',
        component: WifiDialog,
        visible: false,
        defaultWidth: 380,
        defaultHeight: 400,
        defaultX: window.innerWidth - 420,
        defaultY: 100,
        onClose: () => {
          closeWifiDialog();
          ctx.ui.updateModal('wifi-dialog', { visible: false });
        },
      }),
    );

    // Laptop launcher modal — Windows-style chooser
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'laptop-launcher',
        title: 'Laptop',
        component: LaptopLauncherPanel,
        visible: false,
        defaultWidth: 360,
        defaultHeight: 340,
        defaultX: Math.max(20, (window.innerWidth - 360) / 2),
        defaultY: Math.max(20, (window.innerHeight - 340) / 2),
        onClose: () => {
          closeLaptopLauncher();
          ctx.ui.updateModal('laptop-launcher', { visible: false });
        },
      }),
    );

    // Double-click laptop → opens Windows-style launcher
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (device && device.type === 'laptop') {
          openLaptopLauncher(device.id, (choice) => {
            ctx.ui.updateModal('laptop-launcher', { visible: false });

            if (choice === 'terminal') {
              // Emit event for CLI plugin to open terminal
              ctx.events.emit('laptop:open-cli', { deviceId: device.id, deviceType: 'laptop', label: device.label });
            } else if (choice === 'wifi') {
              openWifiDialog(device.id);
              ctx.ui.updateModal('wifi-dialog', { title: `WiFi — ${device.label}`, visible: true });
            } else if (choice === 'network') {
              // Open CLI with ipconfig pre-typed hint
              ctx.events.emit('laptop:open-cli', { deviceId: device.id, deviceType: 'laptop', label: device.label });
            }
          });
          ctx.ui.updateModal('laptop-launcher', { title: `${device.label} — Windows 11`, visible: true });
        }
      }),
    );

    // Register WiFi broadcasters when devices are added
    ctx.onDispose(
      ctx.events.on('canvas:device:added', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (!device) return;

        // Wireless AP auto-broadcasts
        if (device.type === 'wireless-ap') {
          registerAPSSID(device.id, `AP_${device.label}`, '', '');
        }

        // TP-Link initializes with default WiFi config and broadcasts SSIDs
        if (device.type === 'tplink') {
          initTpLinkDevice(device.id, device.label, ctx.canvas, ctx.events);
        }
      }),
    );

    // Printer web GUI modal
    ctx.onDispose(
      ctx.ui.registerModal({
        id: 'printer-gui',
        title: 'HP Embedded Web Server',
        component: PrinterGUIPanel,
        visible: false,
        defaultWidth: 550,
        defaultHeight: 450,
        defaultX: Math.max(20, (window.innerWidth - 550) / 2),
        defaultY: 80,
        onClose: () => {
          closePrinterGUI();
          ctx.ui.updateModal('printer-gui', { visible: false });
        },
      }),
    );

    // Open Printer GUI on double-click
    ctx.onDispose(
      ctx.events.on('canvas:device:dblclick', (payload) => {
        const device = ctx.canvas.getDevice(payload.deviceId);
        if (device && device.type === 'printer') {
          openPrinterGUI(device.id, ctx.canvas, ctx.events);
          ctx.ui.updateModal('printer-gui', {
            title: `HP EWS — ${device.label}`,
            visible: true,
          });
        }
      }),
    );

    // --- ENDPOINT DEVICES ---

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'laptop',
        label: 'Laptop',
        category: 'endpoint',
        ports: [
          { id: 'Ethernet0', label: 'Ethernet', position: { x: 0.9, y: 0.75 }, accepts: ['ethernet'] },
          { id: 'WiFi0', label: 'WiFi', position: { x: 0.5, y: 0.05 }, accepts: ['wireless'] },
        ],
        defaultSize: { width: 65, height: 55 },
        renderer: LaptopRenderer,
        icon: LaptopIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'ip-phone',
        label: 'IP Phone',
        category: 'endpoint',
        ports: [
          { id: 'SW', label: 'Switch Port', position: { x: 0.3, y: 0.95 }, accepts: ['ethernet'] },
          { id: 'PC', label: 'PC Port', position: { x: 0.7, y: 0.95 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 50, height: 60 },
        renderer: IPPhoneRenderer,
        icon: IPPhoneIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'printer',
        label: 'Printer',
        category: 'endpoint',
        ports: [
          { id: 'Ethernet0', label: 'Ethernet', position: { x: 0.85, y: 0.8 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 60, height: 45 },
        renderer: PrinterRenderer,
        icon: PrinterIcon,
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'nas',
        label: 'NAS',
        category: 'endpoint',
        ports: [
          { id: 'Ethernet0', label: 'ETH0', position: { x: 0.2, y: 0.95 }, accepts: ['ethernet'] },
          { id: 'Ethernet1', label: 'ETH1', position: { x: 0.5, y: 0.95 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 40, height: 65 },
        renderer: NASRenderer,
        icon: NASIcon,
      }),
    );

    // --- SWITCH VARIANTS ---

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'switch-24',
        label: 'Switch 24',
        category: 'network',
        ports: Array.from({ length: 24 }, (_, i) => ({
          id: `FastEthernet0/${i + 1}`,
          label: `Fa0/${i + 1}`,
          position: { x: (i % 12 + 0.5) / 12.5, y: i < 12 ? 0.55 : 0.85 },
          accepts: ['ethernet'],
        })),
        defaultSize: { width: 280, height: 50 },
        renderer: SwitchRenderer,
        icon: Switch24Icon,
        defaultConfig: { portCount: 24 },
      }),
    );

    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'switch-unmanaged',
        label: 'Unmanaged SW',
        category: 'network',
        ports: [
          { id: 'Port1', label: 'Port 1', position: { x: 0.08, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port2', label: 'Port 2', position: { x: 0.26, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port3', label: 'Port 3', position: { x: 0.44, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port4', label: 'Port 4', position: { x: 0.62, y: 0.8 }, accepts: ['ethernet'] },
          { id: 'Port5', label: 'Port 5', position: { x: 0.8, y: 0.8 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 100, height: 38 },
        renderer: UnmanagedSwitchRenderer,
        icon: UnmanagedSwitchIcon,
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

    // Devices are added via the left palette (drag-and-drop) — no toolbar buttons needed

    // --- PERSISTENCE ---
    // Save all GUI device configs
    ctx.onSave(() => ({
      pfsense: getPfSenseConfigs(),
      tplink: getTpLinkConfigs(),
      nas: getNasConfigs(),
      printer: getPrinterConfigs(),
    }));

    // Restore GUI device configs on boot
    ctx.onRestore((data: unknown) => {
      const saved = data as Record<string, Record<string, unknown>> | null;
      if (!saved) return;

      if (saved.pfsense) restorePfSenseConfigs(saved.pfsense as Record<string, any>);
      if (saved.tplink) restoreTpLinkConfigs(saved.tplink as Record<string, any>);
      if (saved.nas) restoreNasConfigs(saved.nas as Record<string, any>);
      if (saved.printer) restorePrinterConfigs(saved.printer as Record<string, any>);

      // Re-emit all configs to packet engine so IPs are registered
      for (const [id, cfg] of Object.entries(saved.pfsense ?? {})) {
        const c = cfg as any;
        if (c.interfaces?.wan?.ip || c.interfaces?.lan?.ip) {
          const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
          if (c.interfaces.wan?.enabled) interfaces.set('WAN', { ip: c.interfaces.wan.ip, mask: c.interfaces.wan.mask, shutdown: false });
          if (c.interfaces.lan?.enabled) interfaces.set('LAN', { ip: c.interfaces.lan.ip, mask: c.interfaces.lan.mask, shutdown: false });
          if (c.interfaces.opt1?.enabled) interfaces.set('OPT1', { ip: c.interfaces.opt1.ip, mask: c.interfaces.opt1.mask, shutdown: false });
          ctx.events.emit('cli:config-changed', { deviceId: id, config: { hostname: c.hostname, interfaces, staticRoutes: [] } });
        }
      }
      for (const [id, cfg] of Object.entries(saved.tplink ?? {})) {
        const c = cfg as any;
        if (c.wan?.ip || c.lan?.ip) {
          const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
          interfaces.set('WAN', { ip: c.wan?.ip, mask: c.wan?.mask, shutdown: false });
          interfaces.set('LAN1', { ip: c.lan?.ip, mask: c.lan?.mask, shutdown: false });
          ctx.events.emit('cli:config-changed', { deviceId: id, config: { hostname: c.deviceName, interfaces, staticRoutes: [] } });
        }
      }
      for (const [id, cfg] of Object.entries(saved.nas ?? {})) {
        const c = cfg as any;
        if (c.network?.eth0?.ip) {
          const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
          interfaces.set('Ethernet0', { ip: c.network.eth0.ip, mask: c.network.eth0.mask, shutdown: false });
          ctx.events.emit('cli:config-changed', { deviceId: id, config: { hostname: c.hostname, interfaces, staticRoutes: [] } });
        }
      }
      for (const [id, cfg] of Object.entries(saved.printer ?? {})) {
        const c = cfg as any;
        if (c.network?.ip) {
          const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
          interfaces.set('Ethernet0', { ip: c.network.ip, mask: c.network.mask, shutdown: false });
          ctx.events.emit('cli:config-changed', { deviceId: id, config: { hostname: c.hostname, interfaces, staticRoutes: [] } });
        }
      }

      // Re-emit WiFi SSIDs from restored TP-Link configs (per band)
      for (const [id, cfg] of Object.entries(saved.tplink ?? {})) {
        const c = cfg as any;
        if (c.wifi?.enabled && c.wifi?.ssid) {
          const band = c.wifi.band ?? 'Both';
          if (band === '2.4GHz' || band === 'Both') {
            ctx.events.emit('wifi:ssid-available', {
              deviceId: id, ssid: c.wifi.ssid, password: c.wifi.password ?? '',
              band: '2.4GHz', lanIP: c.lan?.ip ?? '', lanMask: c.lan?.mask ?? '255.255.255.0',
            });
          }
          if (band === '5GHz' || band === 'Both') {
            ctx.events.emit('wifi:ssid-available', {
              deviceId: id, ssid: c.wifi.ssid + '_5G', password: c.wifi.password ?? '',
              band: '5GHz', lanIP: c.lan?.ip ?? '', lanMask: c.lan?.mask ?? '255.255.255.0',
            });
          }
        }
      }

      // Re-register Wireless APs
      for (const device of ctx.canvas.getDevices()) {
        if (device.type === 'wireless-ap') {
          registerAPSSID(device.id, `AP_${device.label}`, '', '');
        }
      }

      console.log('[BasicDevices] Restored GUI configs + WiFi SSIDs');
    });

    console.log('[BasicDevices] Plugin activated');
  },
};
