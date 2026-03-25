import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEventBus, PluginRegistry, PluginLoader, createUIExtensionAPI } from '@netx/kernel';
import { createCanvasEngine } from '@netx/canvas';
import { KernelContext } from './context/KernelContext.js';
import type { KernelInstance } from './context/KernelContext.js';
import { App } from './App.js';
import { AuthProvider } from './auth/AuthContext.js';
import { enableAutoSave, restoreTopology, restoreTopologyFromData, collectTopology } from './persistence.js';
import { enableUndoRedo } from './undo-redo.js';
import { apiLoadData, apiSaveData } from './api/data.js';
import './styles/globals.css';

import { plugins } from './plugins.config.js';

async function bootstrap() {
  console.log('[Boot] Creating kernel...');
  const eventBus = createEventBus();
  const { api: canvasAPI, store: canvasStore } = createCanvasEngine(eventBus);
  const uiAPI = createUIExtensionAPI(eventBus);

  const registry = new PluginRegistry();
  const loader = new PluginLoader(registry, eventBus, canvasAPI, uiAPI);

  for (const plugin of plugins) {
    registry.register(plugin);
  }

  await loader.loadAll();

  // Try loading from server first, fall back to localStorage
  const token = localStorage.getItem('netx-auth-token');
  let loadedFromServer = false;

  if (token) {
    try {
      console.log('[Boot] Loading data from server...');
      const serverData = await apiLoadData();

      if (serverData.topology && typeof serverData.topology === 'object') {
        const topo = serverData.topology as { devices?: unknown[]; connections?: unknown[] };
        if (topo.devices && Array.isArray(topo.devices) && topo.devices.length > 0) {
          restoreTopologyFromData(canvasAPI, topo as any);
          loadedFromServer = true;
        }
      }

      if (serverData.pluginData && typeof serverData.pluginData === 'object') {
        const pd = serverData.pluginData as Record<string, unknown>;
        if (Object.keys(pd).length > 0) {
          loader.restorePluginDataFromObject(pd);
          loadedFromServer = true;
        }
      }

      if (loadedFromServer) {
        console.log('[Boot] Data loaded from server');
      }
    } catch (err) {
      console.warn('[Boot] Failed to load from server, using localStorage:', err);
    }
  }

  // Fall back to localStorage ONLY if server load failed AND no token
  // If we have a token but server failed, don't load stale localStorage from another user
  if (!loadedFromServer && !token) {
    console.log('[Boot] No auth token — loading from localStorage...');
    restoreTopology(canvasAPI);
    loader.restoreAllPluginData();
  } else if (!loadedFromServer && token) {
    console.log('[Boot] Server load failed but user is authenticated — starting with clean canvas');
    // Don't load localStorage — it might belong to a different user
  }

  // Enable local auto-save (fast cache)
  enableAutoSave(canvasStore);
  enableUndoRedo(canvasStore);

  // Local plugin data auto-save (2s)
  setInterval(() => loader.saveAllPluginData(), 2000);

  // Server save function — debounced
  let serverSaveTimer: ReturnType<typeof setTimeout> | null = null;
  const saveToServer = () => {
    if (!localStorage.getItem('netx-auth-token')) return;
    if (serverSaveTimer) clearTimeout(serverSaveTimer);
    serverSaveTimer = setTimeout(async () => {
      try {
        const topology = collectTopology(canvasStore);
        const pluginData = loader.collectAllPluginData();
        const preferences = { theme: document.documentElement.dataset.theme ?? 'dark' };
        await apiSaveData({ topology, pluginData, preferences });
        console.log('[Save] Saved to server');
      } catch {
        // Silent fail — localStorage is the backup
      }
    }, 3000); // 3s debounce — saves 3s after last change
  };

  // Save to server on every canvas change
  canvasStore.subscribe(saveToServer);

  // Also save periodically to catch plugin data changes
  setInterval(saveToServer, 15000);

  // Save to server on page unload
  window.addEventListener('beforeunload', () => {
    if (!localStorage.getItem('netx-auth-token')) return;
    // Synchronous localStorage save
    loader.saveAllPluginData();
    // Best-effort server save
    const topology = collectTopology(canvasStore);
    const pluginData = loader.collectAllPluginData();
    const preferences = { theme: document.documentElement.dataset.theme ?? 'dark' };
    const payload = JSON.stringify({ topology, pluginData, preferences });
    navigator.sendBeacon('/api/data/save', payload);
  });

  return { eventBus, registry, loader, canvasAPI, canvasStore } as KernelInstance;
}

bootstrap()
  .then((kernel) => {
    const root = createRoot(document.getElementById('root')!);
    root.render(
      <StrictMode>
        <AuthProvider>
          <KernelContext.Provider value={kernel}>
            <App />
          </KernelContext.Provider>
        </AuthProvider>
      </StrictMode>
    );
  })
  .catch((err) => {
    console.error('Bootstrap failed:', err);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<pre style="color:red;padding:20px;font-size:14px;">Bootstrap Error:\n${err?.stack ?? err}</pre>`;
    }
  });
