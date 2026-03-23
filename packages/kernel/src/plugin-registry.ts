import type { PluginManifest, PluginModule } from '@netx/sdk';

export class PluginRegistry {
  private modules = new Map<string, PluginModule>();

  register(pluginModule: PluginModule): void {
    const { id } = pluginModule.manifest;
    if (this.modules.has(id)) {
      throw new Error(`Plugin "${id}" is already registered`);
    }
    this.modules.set(id, pluginModule);
  }

  unregister(id: string): void {
    this.modules.delete(id);
  }

  getModule(id: string): PluginModule | undefined {
    return this.modules.get(id);
  }

  getManifests(): PluginManifest[] {
    return Array.from(this.modules.values()).map((m) => m.manifest);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  get size(): number {
    return this.modules.size;
  }
}
