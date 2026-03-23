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

export interface UIExtensionAPI {
  registerPanel(contribution: PanelContribution): Disposable;
  registerToolbarItem(contribution: ToolbarItemContribution): Disposable;
  registerContextMenuItem(contribution: ContextMenuItemContribution): Disposable;
  registerStatusBarItem(contribution: StatusBarItemContribution): Disposable;
  notify(message: string, level?: 'info' | 'warn' | 'error'): void;
}
