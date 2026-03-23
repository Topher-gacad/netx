import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEventBus, PluginRegistry, PluginLoader, createUIExtensionAPI } from '@netx/kernel';
import { createCanvasEngine } from '@netx/canvas';
import { KernelContext } from './context/KernelContext.js';
import type { KernelInstance } from './context/KernelContext.js';
import { App } from './App.js';
import './styles/globals.css';

// Import plugins
import { helloWorldPlugin } from '@netx/plugin-hello-world';

async function bootstrap() {
  // 1. Create kernel infrastructure
  const eventBus = createEventBus();
  const { api: canvasAPI, store: canvasStore } = createCanvasEngine(eventBus);
  const uiAPI = createUIExtensionAPI(eventBus);

  // 2. Create plugin system
  const registry = new PluginRegistry();
  const loader = new PluginLoader(registry, eventBus, canvasAPI, uiAPI);

  // 3. Register plugins
  registry.register(helloWorldPlugin);

  // 4. Load all plugins (resolves deps + activates in order)
  await loader.loadAll();

  // 5. Assemble kernel instance
  const kernel: KernelInstance = {
    eventBus,
    registry,
    loader,
    canvasAPI,
    canvasStore,
  };

  // 6. Render
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
