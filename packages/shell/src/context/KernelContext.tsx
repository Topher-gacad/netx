import { createContext, useContext } from 'react';
import type { EventBus, CanvasAPI } from '@netx/sdk';
import type { PluginLoader, PluginRegistry } from '@netx/kernel';
import type { CanvasState } from '@netx/canvas';
import type { StoreApi } from 'zustand';

export interface KernelInstance {
  eventBus: EventBus;
  registry: PluginRegistry;
  loader: PluginLoader;
  canvasAPI: CanvasAPI;
  canvasStore: StoreApi<CanvasState>;
}

export const KernelContext = createContext<KernelInstance | null>(null);

export function useKernel(): KernelInstance {
  const ctx = useContext(KernelContext);
  if (!ctx) throw new Error('useKernel must be used within KernelContext.Provider');
  return ctx;
}
