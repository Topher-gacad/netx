import type { ComponentType } from 'react';
import type { Disposable } from './common.js';

export type PanelSlot = 'left' | 'right' | 'bottom';

export interface PanelContribution {
  id: string;
  slot: PanelSlot;
  label: string;
  icon?: ComponentType<{ size: number }>;
  component: ComponentType;
  priority?: number;
}

export interface ToolbarItemContribution {
  id: string;
  group: string;
  label: string;
  icon: ComponentType<{ size: number }>;
  onClick: () => void;
  isActive?: () => boolean;
  priority?: number;
  tooltip?: string;
}

export interface ContextMenuItemContribution {
  id: string;
  label: string;
  scope: 'device' | 'connection' | 'canvas';
  onClick: (context: { targetId?: string; position: { x: number; y: number } }) => void;
  icon?: ComponentType<{ size: number }>;
  priority?: number;
  isVisible?: (context: { targetId?: string }) => boolean;
}

export interface StatusBarItemContribution {
  id: string;
  component: ComponentType;
  align: 'left' | 'right';
  priority?: number;
}

// NEW: Canvas overlay — SVG elements rendered on top of the canvas
export interface CanvasOverlayContribution {
  id: string;
  component: ComponentType;
  priority?: number;
}

// NEW: Floating modal window
export interface ModalContribution {
  id: string;
  title: string;
  component: ComponentType;
  visible: boolean;
  defaultX?: number;
  defaultY?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  onClose: () => void;
}

export interface UIExtensionAPI {
  registerPanel(contribution: PanelContribution): Disposable;
  registerToolbarItem(contribution: ToolbarItemContribution): Disposable;
  registerContextMenuItem(contribution: ContextMenuItemContribution): Disposable;
  registerStatusBarItem(contribution: StatusBarItemContribution): Disposable;
  registerCanvasOverlay(contribution: CanvasOverlayContribution): Disposable;
  registerModal(contribution: ModalContribution): Disposable;
  updateModal(id: string, updates: Partial<Pick<ModalContribution, 'title' | 'visible'>>): void;
  notify(message: string, level?: 'info' | 'warn' | 'error'): void;
}
