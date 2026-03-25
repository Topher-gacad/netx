import type { PluginModule } from '@netx/sdk';
import { HelloPanel } from './HelloPanel.js';
import { DeviceCount } from './DeviceCount.js';

export const helloWorldPlugin: PluginModule = {
  manifest: {
    id: 'netx.hello-world',
    name: 'Hello World',
    version: '0.1.0',
    description: 'Proof-of-concept plugin that validates all extension points.',
  },

  activate(ctx) {
    // Register a left panel
    ctx.onDispose(
      ctx.ui.registerPanel({
        id: 'hello-panel',
        slot: 'left',
        label: 'Devices',
        component: HelloPanel,
        priority: 0,
      }),
    );

    // Register toolbar items
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'hello-delete-selected',
        group: 'edit',
        label: 'Delete',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V3h6v1M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7" y1="7" x2="7" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9" y1="7" x2="9" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => {
          const selected = ctx.canvas.getSelection();
          if (selected.length === 0) {
            ctx.ui.notify('Click a device or cable to select it first', 'info');
            return;
          }
          let devices = 0, cables = 0;
          for (const id of selected) {
            if (ctx.canvas.getConnection(id)) {
              ctx.canvas.removeConnection(id);
              cables++;
            } else if (ctx.canvas.getDevice(id)) {
              ctx.canvas.removeDevice(id);
              devices++;
            }
          }
          const parts = [];
          if (devices > 0) parts.push(`${devices} device${devices > 1 ? 's' : ''}`);
          if (cables > 0) parts.push(`${cables} cable${cables > 1 ? 's' : ''}`);
          if (parts.length > 0) ctx.ui.notify(`Removed ${parts.join(' and ')}`, 'info');
        },
        tooltip: 'Delete selected devices or cables (or press Delete key)',
        priority: 5,
      }),
    );

    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'hello-clear',
        group: 'edit',
        label: 'Clear All',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
        onClick: () => {
          const devices = ctx.canvas.getDevices();
          if (devices.length === 0) {
            ctx.ui.notify('No devices to remove', 'info');
            return;
          }
          for (const d of devices) {
            ctx.canvas.removeDevice(d.id);
          }
          ctx.ui.notify(`Removed ${devices.length} devices`, 'warn');
        },
        tooltip: 'Remove all devices from canvas',
        priority: 6,
      }),
    );

    // Register a status bar item
    ctx.onDispose(
      ctx.ui.registerStatusBarItem({
        id: 'hello-device-count',
        component: DeviceCount,
        align: 'left',
        priority: 0,
      }),
    );

    // Register a generic device type for testing
    ctx.onDispose(
      ctx.canvas.registerDeviceType({
        type: 'generic',
        label: 'Device',
        category: 'general',
        ports: [
          { id: 'eth0', label: 'Eth0', position: { x: 0, y: 0.5 }, accepts: ['ethernet'] },
          { id: 'eth1', label: 'Eth1', position: { x: 1, y: 0.5 }, accepts: ['ethernet'] },
          { id: 'eth2', label: 'Eth2', position: { x: 0.5, y: 0 }, accepts: ['ethernet'] },
          { id: 'eth3', label: 'Eth3', position: { x: 0.5, y: 1 }, accepts: ['ethernet'] },
        ],
        defaultSize: { width: 80, height: 60 },
        renderer: ({ id, position, size, selected, label }) => (
          <g data-device-id={id}>
            <defs>
              <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a4a5a" />
                <stop offset="50%" stopColor="#2d2d3a" />
                <stop offset="100%" stopColor="#252532" />
              </linearGradient>
            </defs>
            <rect
              x={position.x}
              y={position.y}
              width={size.width}
              height={size.height}
              rx={4}
              fill={`url(#grad-${id})`}
              stroke={selected ? '#00bceb' : '#555'}
              strokeWidth={selected ? 2 : 0.5}
            />
            <text
              x={position.x + size.width / 2}
              y={position.y + size.height / 2 + 4}
              textAnchor="middle"
              fill="#aaa"
              fontSize={9}
              fontFamily="monospace"
            >
              {label}
            </text>
            <text
              x={position.x + size.width / 2}
              y={position.y + size.height + 14}
              textAnchor="middle"
              fill="#00bceb"
              fontSize={10}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {label}
            </text>
          </g>
        ),
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16">
            <rect x="2" y="3" width="12" height="10" rx="2" fill="#2d2d3a" stroke="#555" strokeWidth="0.5" />
          </svg>
        ),
      }),
    );

    // Register ethernet connection type
    ctx.onDispose(
      ctx.canvas.registerConnectionType({
        type: 'ethernet',
        label: 'Ethernet',
        style: { color: '#4a9eff', width: 2 },
      }),
    );

    // Listen for events
    ctx.onDispose(
      ctx.events.on('canvas:device:added', (payload) => {
        console.log('[HelloWorld] Device added:', payload);
      }),
    );

    // ========== Cable Crimping Simulator ==========
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'crimping-sim',
        group: 'learn',
        label: 'Crimping',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <rect x="5" y="1" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <line x1="7" y1="3" x2="7" y2="9" stroke="currentColor" strokeWidth="0.8" />
            <line x1="9" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="0.8" />
            <rect x="4" y="11" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ),
        onClick: () => {
          window.location.hash = '#/crimping';
        },
        tooltip: 'Cable Crimping Simulator — practice making Ethernet cables',
        priority: 13,
      }),
    );

    // ========== Theme Toggle ==========
    let isDark = (localStorage.getItem('netx-theme') ?? 'dark') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'theme-toggle',
        group: 'settings',
        label: isDark ? 'Light' : 'Dark',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            {isDark ? (
              // Sun icon
              <g>
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
                <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </g>
            ) : (
              // Moon icon
              <path d="M12 3a6 6 0 100 10 5 5 0 01-6-10z" stroke="currentColor" strokeWidth="1.3" />
            )}
          </svg>
        ),
        onClick: () => {
          isDark = !isDark;
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
          localStorage.setItem('netx-theme', isDark ? 'dark' : 'light');
          ctx.ui.notify(`Switched to ${isDark ? 'dark' : 'light'} theme`, 'info');
        },
        tooltip: 'Toggle dark/light theme',
        priority: 99,
      }),
    );

    // ========== Export/Import Topology ==========
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'export-topology',
        group: 'file',
        label: 'Export',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => {
          const topology = {
            version: 1,
            exportedAt: new Date().toISOString(),
            devices: ctx.canvas.getDevices(),
            connections: ctx.canvas.getConnections(),
            pluginData: {} as Record<string, unknown>,
          };

          // Gather plugin data from localStorage
          try {
            const raw = localStorage.getItem('netx-plugin-data');
            if (raw) topology.pluginData = JSON.parse(raw);
          } catch { /* ignore */ }

          const json = JSON.stringify(topology, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `netx-topology-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          ctx.ui.notify('Topology exported', 'info');
        },
        tooltip: 'Export topology as JSON file',
        priority: 50,
      }),
    );

    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'import-topology',
        group: 'file',
        label: 'Import',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path d="M8 10V2M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const data = JSON.parse(reader.result as string);
                if (!data.devices || !data.connections) {
                  ctx.ui.notify('Invalid topology file', 'error');
                  return;
                }

                // Clear current topology
                for (const d of ctx.canvas.getDevices()) {
                  ctx.canvas.removeDevice(d.id);
                }

                // Restore devices with original IDs
                for (const device of data.devices) {
                  try {
                    const added = ctx.canvas.addDevice(device.type, device.position, device.config, device.id);
                    ctx.canvas.updateDevice(added.id, { label: device.label, size: device.size });
                  } catch (err) {
                    console.warn('Failed to import device:', err);
                  }
                }

                // Restore connections
                for (const conn of data.connections) {
                  try {
                    ctx.canvas.addConnection(conn.type, conn.sourceDeviceId, conn.sourcePortId, conn.targetDeviceId, conn.targetPortId);
                  } catch (err) {
                    console.warn('Failed to import connection:', err);
                  }
                }

                // Restore plugin data
                if (data.pluginData) {
                  try {
                    localStorage.setItem('netx-plugin-data', JSON.stringify(data.pluginData));
                  } catch { /* ignore */ }
                }

                ctx.ui.notify(`Imported ${data.devices.length} devices and ${data.connections.length} connections. Refresh to load CLI configs.`, 'info');
              } catch (err) {
                ctx.ui.notify('Failed to parse topology file', 'error');
              }
            };
            reader.readAsText(file);
          };
          input.click();
        },
        tooltip: 'Import topology from JSON file',
        priority: 51,
      }),
    );

    ctx.state.set('initialized', true);
    console.log('[HelloWorld] Plugin activated');
  },

  deactivate() {
    console.log('[HelloWorld] Plugin deactivated');
  },
};
