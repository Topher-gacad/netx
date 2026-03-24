import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEventBus, PluginRegistry, PluginLoader, createUIExtensionAPI } from '@netx/kernel';
import { createCanvasEngine } from '@netx/canvas';
import { KernelContext } from './context/KernelContext.js';
import type { KernelInstance } from './context/KernelContext.js';
import { App } from './App.js';
import { enableAutoSave, restoreTopology } from './persistence.js';
import './styles/globals.css';

// Import plugins
import { helloWorldPlugin } from '@netx/plugin-hello-world';
import { basicDevicesPlugin } from '@netx/plugin-basic-devices';
import { cliSimulatorPlugin, restoreCLIStates, cliDeviceStates } from '@netx/plugin-cli-simulator';
import { packetEnginePlugin } from '@netx/plugin-packet-engine';
import { labSystemPlugin } from '@netx/plugin-lab-system';

async function bootstrap() {
  // 1. Create kernel infrastructure
  const eventBus = createEventBus();
  const { api: canvasAPI, store: canvasStore } = createCanvasEngine(eventBus);
  const uiAPI = createUIExtensionAPI(eventBus);

  // 2. Create plugin system
  const registry = new PluginRegistry();
  const loader = new PluginLoader(registry, eventBus, canvasAPI, uiAPI);

  // 3. Register plugins
  registry.register(basicDevicesPlugin);
  registry.register(cliSimulatorPlugin);
  registry.register(packetEnginePlugin);
  registry.register(labSystemPlugin);
  registry.register(helloWorldPlugin);

  // 4. Load all plugins (registers device types, CLI, packet engine, labs)
  await loader.loadAll();

  // 5. Restore topology with ORIGINAL device IDs (no remapping needed)
  restoreTopology(canvasAPI);

  // 6. Restore CLI configs (IDs match because topology kept original IDs)
  restoreCLIStates();

  // 7. Sync all CLI configs to packet engine + canvas labels
  for (const [id, state] of cliDeviceStates) {
    eventBus.emit('cli:config-changed', {
      deviceId: id,
      config: {
        hostname: state.hostname,
        interfaces: state.interfaces,
        staticRoutes: state.staticRoutes,
      },
    });
    const ips: string[] = [];
    for (const [, iface] of state.interfaces) {
      if (iface.ip) ips.push(`${iface.ip}/${iface.mask ?? ''}`);
    }
    const device = canvasAPI.getDevice(id);
    if (device) {
      canvasAPI.updateDevice(id, {
        label: state.hostname,
        config: { ...device.config, ips, hostname: state.hostname },
      });
    }
  }

  // 8. Enable auto-save
  enableAutoSave(canvasStore);

  // 9. Render
  const kernel: KernelInstance = {
    eventBus, registry, loader, canvasAPI, canvasStore,
  };

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <KernelContext.Provider value={kernel}>
        <App />
      </KernelContext.Provider>
    </StrictMode>
  );
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<pre style="color:red;padding:20px;font-size:14px;">Bootstrap Error:\n${err?.stack ?? err}</pre>`;
  }
});
