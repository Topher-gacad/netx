import type {
  Disposable,
  EventBus,
  UIExtensionAPI,
  PanelContribution,
  ToolbarItemContribution,
  ContextMenuItemContribution,
  StatusBarItemContribution,
  CanvasOverlayContribution,
  ModalContribution,
} from '@netx/sdk';
// v2 — with canvas overlays + modals
import { createStore } from 'zustand/vanilla';

export interface UIState {
  panels: PanelContribution[];
  toolbarItems: ToolbarItemContribution[];
  contextMenuItems: ContextMenuItemContribution[];
  statusBarItems: StatusBarItemContribution[];
  canvasOverlays: CanvasOverlayContribution[];
  modals: ModalContribution[];
}

export const uiStore = createStore<UIState>(() => ({
  panels: [],
  toolbarItems: [],
  contextMenuItems: [],
  statusBarItems: [],
  canvasOverlays: [],
  modals: [],
}));

export function createUIExtensionAPI(eventBus: EventBus): UIExtensionAPI {
  return {
    registerPanel(contribution: PanelContribution): Disposable {
      uiStore.setState((s) => ({ panels: [...s.panels, contribution] }));
      return {
        dispose() {
          uiStore.setState((s) => ({ panels: s.panels.filter((p) => p.id !== contribution.id) }));
        },
      };
    },

    registerToolbarItem(contribution: ToolbarItemContribution): Disposable {
      uiStore.setState((s) => ({ toolbarItems: [...s.toolbarItems, contribution] }));
      return {
        dispose() {
          uiStore.setState((s) => ({ toolbarItems: s.toolbarItems.filter((t) => t.id !== contribution.id) }));
        },
      };
    },

    registerContextMenuItem(contribution: ContextMenuItemContribution): Disposable {
      uiStore.setState((s) => ({ contextMenuItems: [...s.contextMenuItems, contribution] }));
      return {
        dispose() {
          uiStore.setState((s) => ({ contextMenuItems: s.contextMenuItems.filter((c) => c.id !== contribution.id) }));
        },
      };
    },

    registerStatusBarItem(contribution: StatusBarItemContribution): Disposable {
      uiStore.setState((s) => ({ statusBarItems: [...s.statusBarItems, contribution] }));
      return {
        dispose() {
          uiStore.setState((s) => ({ statusBarItems: s.statusBarItems.filter((sb) => sb.id !== contribution.id) }));
        },
      };
    },

    registerCanvasOverlay(contribution: CanvasOverlayContribution): Disposable {
      uiStore.setState((s) => ({ canvasOverlays: [...s.canvasOverlays, contribution] }));
      return {
        dispose() {
          uiStore.setState((s) => ({ canvasOverlays: s.canvasOverlays.filter((o) => o.id !== contribution.id) }));
        },
      };
    },

    registerModal(contribution: ModalContribution): Disposable {
      uiStore.setState((s) => ({ modals: [...s.modals, contribution] }));
      return {
        dispose() {
          uiStore.setState((s) => ({ modals: s.modals.filter((m) => m.id !== contribution.id) }));
        },
      };
    },

    updateModal(id: string, updates: Partial<Pick<ModalContribution, 'title' | 'visible'>>) {
      uiStore.setState((s) => ({
        modals: s.modals.map((m) => m.id === id ? { ...m, ...updates } : m),
      }));
    },

    notify(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
      eventBus.emit('ui:notification', { message, level });
    },
  };
}
