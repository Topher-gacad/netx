import type { PluginModule } from '@netx/sdk';
import { LabPanel, setLabCanvasAPI, triggerLabCheck } from './LabPanel.js';
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

    // Toolbar button
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'labs-toggle',
        group: 'learn',
        label: 'Labs',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" rx="2" />
            <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
        onClick: () => {
          ctx.ui.notify('Open the "Labs" tab in the right panel to start a lab', 'info');
        },
        tooltip: 'Guided networking labs',
        priority: 15,
      }),
    );

    // Status bar
    ctx.onDispose(
      ctx.ui.registerStatusBarItem({
        id: 'lab-status',
        align: 'right',
        component: () => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            Labs: <span style={{ color: '#00ff88' }}>4 available</span>
          </span>
        ),
        priority: 30,
      }),
    );

    console.log('[LabSystem] Plugin activated — 4 labs available');
  },
};
