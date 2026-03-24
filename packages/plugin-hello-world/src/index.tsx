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

    ctx.state.set('initialized', true);
    console.log('[HelloWorld] Plugin activated');
  },

  deactivate() {
    console.log('[HelloWorld] Plugin deactivated');
  },
};
