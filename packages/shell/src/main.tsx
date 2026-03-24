import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEventBus, PluginRegistry, PluginLoader, createUIExtensionAPI } from '@netx/kernel';
import { createCanvasEngine } from '@netx/canvas';
import { KernelContext } from './context/KernelContext.js';
import type { KernelInstance } from './context/KernelContext.js';
import { App } from './App.js';
import { enableAutoSave, restoreTopology } from './persistence.js';
import { enableUndoRedo } from './undo-redo.js';
import './styles/globals.css';

// Plugin registry — the ONLY place plugins are listed
import { plugins } from './plugins.config.js';

async function bootstrap() {
  console.log('[Boot] Step 1: Create kernel');
  const eventBus = createEventBus();
  const { api: canvasAPI, store: canvasStore } = createCanvasEngine(eventBus);
  const uiAPI = createUIExtensionAPI(eventBus);

  console.log('[Boot] Step 2: Create plugin system');
  const registry = new PluginRegistry();
  const loader = new PluginLoader(registry, eventBus, canvasAPI, uiAPI);

  console.log('[Boot] Step 3: Register plugins');
  for (const plugin of plugins) {
    registry.register(plugin);
  }

  console.log('[Boot] Step 4: Load all plugins');
  await loader.loadAll();

  console.log('[Boot] Step 5: Restore topology');
  restoreTopology(canvasAPI);

  console.log('[Boot] Step 6: Restore plugin data');
  loader.restoreAllPluginData();

  // 7. Enable auto-save for topology
  enableAutoSave(canvasStore);

  // 8. Enable undo/redo (Ctrl+Z / Ctrl+Y)
  enableUndoRedo(canvasStore);

  // 9. Auto-save plugin data periodically
  setInterval(() => loader.saveAllPluginData(), 2000);

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
