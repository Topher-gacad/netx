import type { Disposable } from './common.js';
import type { EventBus } from './events.js';
import type { StateStore } from './state.js';
import type { CanvasAPI } from './canvas.js';
import type { UIExtensionAPI } from './ui.js';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
}

export interface PluginContext {
  manifest: PluginManifest;
  events: EventBus;
  state: StateStore;
  canvas: CanvasAPI;
  ui: UIExtensionAPI;
  onDispose(disposable: Disposable | (() => void)): void;
  /** Register a callback to save plugin state (called on auto-save + before unload) */
  onSave(callback: () => unknown): void;
  /** Register a callback to restore plugin state (called on boot after topology restore) */
  onRestore(callback: (data: unknown) => void): void;
}

export interface PluginModule {
  manifest: PluginManifest;
  activate(context: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
