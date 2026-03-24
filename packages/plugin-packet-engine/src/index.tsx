import type { PluginModule, ID } from '@netx/sdk';
import { simulatePacket, registerDeviceConfig } from './network-validator.js';
import type { DeviceNetConfig } from './network-validator.js';
import { launchPacket, clearPackets } from './packet-animator.js';
import { PacketOverlay, setOverlayCanvasAPI } from './PacketOverlay.js';
import { PacketLog, addLogEntry } from './PacketLog.js';

// Event types for CLI integration
declare module '@netx/sdk' {
  interface NetXEventMap {
    'cli:ping': { sourceDeviceId: ID; targetIP: string };
    'cli:config-changed': { deviceId: ID; config: DeviceNetConfig };
    'packet:result': { success: boolean; message: string };
  }
}

export const packetEnginePlugin: PluginModule = {
  manifest: {
    id: 'netx.packet-engine',
    name: 'Packet Engine',
    version: '0.1.0',
    description: 'Packet simulation with animated visual feedback.',
    dependencies: ['netx.basic-devices'],
  },

  activate(ctx) {
    setOverlayCanvasAPI(ctx.canvas);

    // Listen for CLI config changes
    ctx.onDispose(
      ctx.events.on('cli:config-changed', (payload) => {
        registerDeviceConfig(payload.deviceId, payload.config);
      }),
    );

    // Listen for ping commands from CLI
    ctx.onDispose(
      ctx.events.on('cli:ping', (payload) => {
        const { sourceDeviceId, targetIP } = payload;
        const sourceDevice = ctx.canvas.getDevice(sourceDeviceId);
        const sourceName = sourceDevice?.label ?? 'Unknown';

        addLogEntry(`${sourceName} → ping ${targetIP}`, 'info');

        const result = simulatePacket(sourceDeviceId, targetIP, ctx.canvas);

        if (result.hops.length > 0) {
          launchPacket(
            'icmp',
            result.hops,
            result.success,
            result.errorAtHop,
            result.error,
          );
        }

        if (result.success) {
          addLogEntry(`Reply from ${targetIP} — 5/5 packets`, 'success');
          ctx.events.emit('packet:result', {
            success: true,
            message: `Success rate is 100 percent (5/5)`,
          });
        } else {
          addLogEntry(`Failed: ${result.error}`, 'error');
          ctx.events.emit('packet:result', {
            success: false,
            message: result.error ?? 'Ping failed',
          });
        }
      }),
    );

    // Register packet overlay in the right panel for the log
    ctx.onDispose(
      ctx.ui.registerPanel({
        id: 'packet-log',
        slot: 'right',
        label: 'Packets',
        component: PacketLog,
        priority: 0,
      }),
    );

    // PacketOverlay is rendered directly in the SVG canvas by the Shell
    // (passed as children to SVGRenderer)

    // Toolbar button to clear all packets
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'clear-packets',
        group: 'simulation',
        label: 'Clear Sim',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => {
          clearPackets();
          ctx.ui.notify('Simulation cleared', 'info');
        },
        tooltip: 'Clear all packet animations',
        priority: 20,
      }),
    );

    // Status bar indicator
    ctx.onDispose(
      ctx.ui.registerStatusBarItem({
        id: 'packet-status',
        align: 'right',
        component: () => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            Sim: <span style={{ color: '#00ff88' }}>Active</span>
          </span>
        ),
        priority: 20,
      }),
    );

    console.log('[PacketEngine] Plugin activated');
  },
};

// Re-export for shell integration
export { PacketOverlay } from './PacketOverlay.js';
export { registerDeviceConfig } from './network-validator.js';
export type { DeviceNetConfig } from './network-validator.js';
