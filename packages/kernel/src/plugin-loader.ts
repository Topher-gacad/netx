import type { Disposable, EventBus, PluginContext, PluginModule, CanvasAPI, UIExtensionAPI } from '@netx/sdk';
import { PluginRegistry } from './plugin-registry.js';
import { createScopedStore } from './state-store.js';
import { resolveDependencyOrder } from './dependency-resolver.js';

interface ActivePlugin {
  module: PluginModule;
  disposables: Disposable[];
}

export class PluginLoader {
  private active = new Map<string, ActivePlugin>();

  constructor(
    private registry: PluginRegistry,
    private eventBus: EventBus,
    private canvasAPI: CanvasAPI,
    private uiAPI: UIExtensionAPI,
  ) {}

  async loadAll(): Promise<void> {
    const manifests = this.registry.getManifests();
    const order = resolveDependencyOrder(manifests);

    for (const pluginId of order) {
      await this.activate(pluginId);
    }

    this.eventBus.emit('kernel:ready', undefined as unknown as void);
  }

  async activate(pluginId: string): Promise<void> {
    if (this.active.has(pluginId)) {
      return; // already active
    }

    const module = this.registry.getModule(pluginId);
    if (!module) {
      console.error(`[Kernel] Plugin "${pluginId}" not found in registry`);
      return;
    }

    const disposables: Disposable[] = [];

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
    };

    try {
      await module.activate(context);
      this.active.set(pluginId, { module, disposables });
      this.eventBus.emit('plugin:activated', { pluginId });
    } catch (err) {
      console.error(`[Kernel] Failed to activate plugin "${pluginId}":`, err);
      this.eventBus.emit('plugin:error', { pluginId, error: err });
      // Dispose anything that was registered before the error
      for (const d of disposables) {
        try { d.dispose(); } catch { /* ignore */ }
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
