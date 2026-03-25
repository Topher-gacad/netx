import type { PluginModule } from '@netx/sdk';
import { LabPanel, setLabCanvasAPI, triggerLabCheck, startLabById } from './LabPanel.js';
import { updateDeviceConfig, recordPingSuccess } from './lab-validator.js';

export const labSystemPlugin: PluginModule = {
  manifest: {
    id: 'netx.lab-system',
    name: 'Lab System',
    version: '0.1.0',
    description: 'Guided networking labs with step-by-step objectives and real-time validation.',
    dependencies: ['netx.basic-devices'],
  },

  activate(ctx) {
    setLabCanvasAPI(ctx.canvas);

    // Register lab panel in the right slot
    ctx.onDispose(
      ctx.ui.registerPanel({
        id: 'lab-panel',
        slot: 'right',
        label: 'Labs',
        component: LabPanel,
        priority: -1,
      }),
    );

    // Listen for canvas changes to re-validate objectives
    ctx.onDispose(ctx.events.on('canvas:device:added', () => triggerLabCheck()));
    ctx.onDispose(ctx.events.on('canvas:device:removed', () => triggerLabCheck()));
    ctx.onDispose(ctx.events.on('canvas:connection:added', () => triggerLabCheck()));
    ctx.onDispose(ctx.events.on('canvas:connection:removed', () => triggerLabCheck()));

    // Listen for CLI config changes to validate IP/hostname objectives
    ctx.onDispose(
      ctx.events.on('cli:config-changed', (payload) => {
        updateDeviceConfig(payload.deviceId, payload.config);
        triggerLabCheck();
      }),
    );

    // Listen for successful pings
    ctx.onDispose(
      ctx.events.on('packet:result', (payload) => {
        if (payload.success) {
          recordPingSuccess('any', 'any');
          triggerLabCheck();
        }
      }),
    );

    // Labs accessible via right panel tab — no toolbar button needed

    // Status bar
    ctx.onDispose(
      ctx.ui.registerStatusBarItem({
        id: 'lab-status',
        align: 'right',
        component: () => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            Labs: <span style={{ color: '#00ff88' }}>18 available</span>
          </span>
        ),
        priority: 30,
      }),
    );

    // Listen for bootcamp lab launch requests
    window.addEventListener('bootcamp:launch-lab', ((e: CustomEvent) => {
      const { labId } = e.detail;
      startLabById(labId);
      ctx.ui.notify(`Lab started: ${labId}`, 'info');
    }) as EventListener);

    // Also listen via event bus
    ctx.onDispose(
      ctx.events.on('bootcamp:launch-lab', (payload: unknown) => {
        const { labId } = payload as { labId: string };
        startLabById(labId);
      }),
    );

    console.log('[LabSystem] Plugin activated');
  },
};
