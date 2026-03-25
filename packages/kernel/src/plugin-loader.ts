import type { Disposable, EventBus, PluginContext, PluginModule, CanvasAPI, UIExtensionAPI } from '@netx/sdk';
import { PluginRegistry } from './plugin-registry.js';
import { createScopedStore } from './state-store.js';
import { resolveDependencyOrder } from './dependency-resolver.js';

const PLUGIN_DATA_KEY = 'netx-plugin-data';

interface ActivePlugin {
  module: PluginModule;
  disposables: Disposable[];
  saveCallback?: () => unknown;
  restoreCallback?: (data: unknown) => void;
}

export class PluginLoader {
  private active = new Map<string, ActivePlugin>();

  constructor(
    private registry: PluginRegistry,
    private eventBus: EventBus,
    private canvasAPI: CanvasAPI,
    private uiAPI: UIExtensionAPI,
  ) {
    // Save all plugin data before page unload
    window.addEventListener('beforeunload', () => this.saveAllPluginData());
  }

  async loadAll(): Promise<void> {
    const manifests = this.registry.getManifests();
    const order = resolveDependencyOrder(manifests);

    for (const pluginId of order) {
      await this.activate(pluginId);
    }

    this.eventBus.emit('kernel:ready', undefined as unknown as void);
  }

  async activate(pluginId: string): Promise<void> {
    if (this.active.has(pluginId)) return;

    const module = this.registry.getModule(pluginId);
    if (!module) {
      console.error(`[Kernel] Plugin "${pluginId}" not found in registry`);
      return;
    }

    const disposables: Disposable[] = [];
    const activePlugin: ActivePlugin = { module, disposables };

    const context: PluginContext = {
      manifest: module.manifest,
      events: this.eventBus,
      state: createScopedStore(pluginId),
      canvas: this.canvasAPI,
      ui: this.uiAPI,
      onDispose(disposable: Disposable | (() => void)) {
        if (typeof disposable === 'function') {
          disposables.push({ dispose: disposable });
        } else {
          disposables.push(disposable);
        }
      },
      onSave(callback: () => unknown) {
        activePlugin.saveCallback = callback;
      },
      onRestore(callback: (data: unknown) => void) {
        activePlugin.restoreCallback = callback;
      },
    };

    try {
      await module.activate(context);
      this.active.set(pluginId, activePlugin);
      this.eventBus.emit('plugin:activated', { pluginId });
    } catch (err) {
      console.error(`[Kernel] Failed to activate plugin "${pluginId}":`, err);
      this.eventBus.emit('plugin:error', { pluginId, error: err });
      for (const d of disposables) {
        try { d.dispose(); } catch { /* ignore */ }
      }
    }
  }

  /** Call all plugins' onRestore callbacks with their saved data */
  restoreAllPluginData(): void {
    try {
      const raw = localStorage.getItem(PLUGIN_DATA_KEY);
      if (!raw) return;
      const allData: Record<string, unknown> = JSON.parse(raw);

      for (const [pluginId, plugin] of this.active) {
        if (plugin.restoreCallback && allData[pluginId] !== undefined) {
          try {
            plugin.restoreCallback(allData[pluginId]);
            console.log(`[Kernel] Restored data for plugin "${pluginId}"`);
          } catch (err) {
            console.error(`[Kernel] Failed to restore data for plugin "${pluginId}":`, err);
          }
        }
      }
    } catch (err) {
      console.warn('[Kernel] Failed to restore plugin data:', err);
    }
  }

  /** Call all plugins' onSave callbacks and persist to localStorage */
  saveAllPluginData(): void {
    const allData: Record<string, unknown> = {};
    for (const [pluginId, plugin] of this.active) {
      if (plugin.saveCallback) {
        try {
          allData[pluginId] = plugin.saveCallback();
        } catch (err) {
          console.error(`[Kernel] Failed to save data for plugin "${pluginId}":`, err);
        }
      }
    }
    try {
      localStorage.setItem(PLUGIN_DATA_KEY, JSON.stringify(allData));
    } catch (err) {
      console.warn('[Kernel] Failed to persist plugin data:', err);
    }
  }

  /** Collect all plugin data as an object (without saving to localStorage) */
  collectAllPluginData(): Record<string, unknown> {
    const allData: Record<string, unknown> = {};
    for (const [pluginId, plugin] of this.active) {
      if (plugin.saveCallback) {
        try {
          allData[pluginId] = plugin.saveCallback();
        } catch (err) {
          console.error(`[Kernel] Failed to collect data for plugin "${pluginId}":`, err);
        }
      }
    }
    return allData;
  }

  /** Restore plugin data from a provided object (not localStorage) */
  restorePluginDataFromObject(allData: Record<string, unknown>): void {
    for (const [pluginId, plugin] of this.active) {
      if (plugin.restoreCallback && allData[pluginId] !== undefined) {
        try {
          plugin.restoreCallback(allData[pluginId]);
          console.log(`[Kernel] Restored data for plugin "${pluginId}" from server`);
        } catch (err) {
          console.error(`[Kernel] Failed to restore data for plugin "${pluginId}":`, err);
        }
      }
    }
  }

  async deactivate(pluginId: string): Promise<void> {
    const active = this.active.get(pluginId);
    if (!active) return;

    try {
      await active.module.deactivate?.();
    } catch (err) {
      console.error(`[Kernel] Error deactivating plugin "${pluginId}":`, err);
    }

    for (const d of active.disposables) {
      try { d.dispose(); } catch { /* ignore */ }
    }

    this.active.delete(pluginId);
    this.eventBus.emit('plugin:deactivated', { pluginId });
  }

  async deactivateAll(): Promise<void> {
    const ids = Array.from(this.active.keys()).reverse();
    for (const id of ids) {
      await this.deactivate(id);
    }
  }

  isActive(pluginId: string): boolean {
    return this.active.has(pluginId);
  }
}
