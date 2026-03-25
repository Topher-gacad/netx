import type { PluginModule, ID } from '@netx/sdk';
import { simulatePacket, registerDeviceConfig, findDuplicateIPs } from './network-validator.js';
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

    // Listen for CLI config changes + check for duplicate IPs
    ctx.onDispose(
      ctx.events.on('cli:config-changed', (payload) => {
        registerDeviceConfig(payload.deviceId, payload.config);

        // Check for duplicate IPs after every config change
        const duplicates = findDuplicateIPs(ctx.canvas);
        for (const dup of duplicates) {
          ctx.ui.notify(
            `IP conflict: ${dup.ip} is assigned to ${dup.devices.join(' and ')}. Each device must have a unique IP!`,
            'error',
          );
        }
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

    // Register packet animation overlay on the canvas via extension API
    ctx.onDispose(
      ctx.ui.registerCanvasOverlay({
        id: 'packet-overlay',
        component: PacketOverlay,
        priority: 0,
      }),
    );

    // Packet animations auto-clear — no toolbar button needed

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

export { registerDeviceConfig } from './network-validator.js';
export type { DeviceNetConfig } from './network-validator.js';
