import { useState, useMemo } from 'react';
import { useStore } from 'zustand';
import { uiStore } from '@netx/kernel';
import type { PanelSlot } from '@netx/sdk';

interface PanelProps {
  slot: PanelSlot;
  defaultOpen?: boolean;
}

export function Panel({ slot, defaultOpen = true }: PanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState(0);

  const allPanels = useStore(uiStore, (s) => s.panels);
  const panels = useMemo(
    () => allPanels
      .filter((p) => p.slot === slot)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    [allPanels, slot],
  );

  if (panels.length === 0) return null;

  const isHorizontal = slot === 'bottom';
  const sizeStyle = isHorizontal
    ? { height: open ? '200px' : '32px', width: '100%' }
    : { width: open ? '280px' : '36px', height: '100%' };

  const ActiveComponent = panels[activeTab]?.component;

  return (
    <div
      style={{
        ...sizeStyle,
        background: 'var(--bg-secondary)',
        borderLeft: slot === 'right' ? '1px solid var(--border-color)' : undefined,
        borderRight: slot === 'left' ? '1px solid var(--border-color)' : undefined,
        borderTop: slot === 'bottom' ? '1px solid var(--border-color)' : undefined,
        display: 'flex',
        flexDirection: isHorizontal ? 'column' : 'column',
        overflow: 'hidden',
        transition: 'width 0.2s, height 0.2s',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          minHeight: '32px',
          borderBottom: open ? '1px solid var(--border-color)' : undefined,
          padding: '0 4px',
          gap: '2px',
        }}
      >
        {open && panels.map((panel, i) => (
          <button
            key={panel.id}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '4px 10px',
              background: i === activeTab ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none',
              borderRadius: '3px',
              color: i === activeTab ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: i === activeTab ? 600 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {panel.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: '2px 6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {open ? (isHorizontal ? '\u25BC' : slot === 'left' ? '\u25C0' : '\u25B6') : (isHorizontal ? '\u25B2' : slot === 'left' ? '\u25B6' : '\u25C0')}
        </button>
      </div>

      {/* Panel content */}
      {open && ActiveComponent && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          <ActiveComponent />
        </div>
      )}
    </div>
  );
}
